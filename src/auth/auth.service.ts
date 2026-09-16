import { BadRequestException, Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';


@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService'); //para mostrar los errores de forma mas clara

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const { password, ...userData } = createUserDto;
      // 1. Instanciamos el usuario con el hash
      const user = this.userRepository.create({
        ...userData,
        password: bcrypt.hashSync(password, 10),
      });
      // 2. Al guardar en BD, TypeORM le asigna el ID generado a la variable "user"
      await this.userRepository.save(user);
      // 3. Excluimos la contraseña antes de retornar
      const {password: _, ...userWithoutPassword } = user;

      return {
        ...userWithoutPassword,
        token: this.getJwtToken({id: user.id})
      };
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const {password, email} = loginUserDto;

    const user = await this.userRepository.findOne({
      where: {email},
      select: {id: true, email: true, password: true}
    });

    if(!user) throw new UnauthorizedException('Credentials are not valid (email)');

    if(!bcrypt.compareSync(password, user.password))
      throw new UnauthorizedException('Credentials are not valid (epassword)');

    return {
      ...user,
      token: this.getJwtToken({id: user.id})
    };
  //TODO: retornar el JWT
  }

  async checkAuthStatus(user: User){
    const { password: _, ...userWithoutPassword } = user;

    return {
      ...userWithoutPassword,
      token: this.getJwtToken({ id: user.id }),
    };
  }

  private getJwtToken(payload: JwtPayload){
    const token = this.jwtService.sign(payload);
    return token;
  }

  private handleDBExceptions(error: any): never {
    // retornamos never significa que no retornamos nada, si intentamos retornar algo da error
    // Código 23505 = Registro duplicado en PostgreSQL (Unique constraint)
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }

    // Si es un error desconocido, imprimimos solo el objeto formateado
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }
}
