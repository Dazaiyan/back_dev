import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcryptjs';
import { I18nService } from 'nestjs-i18n';
import { User } from '@/user/user.entity';
import { AuthUserDto } from '@/user/dto/authUser.dto';
import { GetUserDto } from '@/user/dto/getUser.dto';
import { CreateUserDto } from '@/user/dto/createUser.dto';
import { UpdateUserDto } from '@/user/dto/updateUser.dto';
import { FiltersUserDto } from './dto/filtersUser.dto';
import { RoleService } from '@/role/role.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly roleService: RoleService,
    private readonly i18n: I18nService, // Inyección de I18nService
  ) {}

  private async createHttpException(
    messageKey: string,
    args?: Record<string, any>,
    status: HttpStatus = HttpStatus.NOT_FOUND,
  ): Promise<HttpException> {
    const errorMsg = await this.i18n.translate(messageKey, { args }) as string;

    this.logger.error(errorMsg);
    return new HttpException(errorMsg, status);
  }

  async findOneByDocument(document: string): Promise<AuthUserDto> {
    const user = await this.userRepository.findOne({
      where: { document },
      relations: ['role'],
    });

    if (!user) {
      throw await this.createHttpException('errors.user.not_found', {
        key: 'document',
        value: document,
      });
    }

    return user;
  }

  async findByOneById(id: number): Promise<GetUserDto> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) {
      throw await this.createHttpException('errors.user.not_found', {
        key: 'ID',
        value: id,
      });
    }

    return plainToInstance(GetUserDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async findOneByEmail(email: string): Promise<AuthUserDto> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw await this.createHttpException('errors.user.not_found', {
        key: 'email',
        value: email,
      });
    }

    return user;
  }

  async findOneByResetPasswordToken(
    resetPasswordToken: string,
  ): Promise<AuthUserDto> {
    const user = await this.userRepository.findOne({
      where: { resetPasswordToken },
      relations: ['role'],
    });

    if (!user) {
      throw await this.createHttpException('errors.user.not_found', {
        key: 'resetPasswordToken',
        value: resetPasswordToken,
      });
    }

    return user;
  }

  async findAllFilter(filtersUserDto: FiltersUserDto): Promise<any> {
    const { username, name_role, page = 1, limit = 10 } = filtersUserDto;

    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role');

    if (username) {
      query.andWhere('user.username ILIKE :username', {
        username: `%${username}%`,
      });
    }

    if (name_role) {
      query.andWhere('role.name_role ILIKE :name_role', {
        name_role: `%${name_role}%`,
      });
    }

    query.orderBy('user.createdAt', 'DESC');
    query.skip((page - 1) * limit).take(limit);

    try {
      const [users, totalCount] = await query.getManyAndCount();
      this.logger.log(await this.i18n.translate('user.searching'));

      const totalPages = Math.ceil(totalCount / limit);

      const userDtos = users.map((user) =>
        plainToInstance(GetUserDto, user, {
          excludeExtraneousValues: true,
        }),
      );

      return {
        data: userDtos,
        totalCount,
        totalPages,
      };
    } catch (error) {
      throw await this.createHttpException('errors.user.search_failed', {}, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createUser(userDto: CreateUserDto): Promise<GetUserDto> {
    const { role, password, ...otherFields } = userDto;

    const hashedPassword = await bcrypt.hash(password, 10);
    const roleDb = await this.roleService.findByName(role.name_role);

    const newUser = this.userRepository.create({
      ...otherFields,
      role: roleDb,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(newUser);

    this.logger.log(await this.i18n.translate('user.created'));

    return plainToInstance(GetUserDto, savedUser, {
      excludeExtraneousValues: true,
    });
  }

  async updateUser(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<GetUserDto> {
    const user = await this.findByOneById(id);

    if (!Object.keys(updateUserDto).length) {
      throw await this.createHttpException('errors.user.update_empty_data', {}, HttpStatus.BAD_REQUEST);
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);

    const updatedUser = await this.userRepository.save(user);

    this.logger.log(await this.i18n.translate('user.updated'));

    return plainToInstance(GetUserDto, updatedUser, {
      excludeExtraneousValues: true,
    });
  }
}
