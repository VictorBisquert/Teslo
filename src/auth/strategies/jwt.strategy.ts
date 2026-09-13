// Esta clase es una estrategia de autenticación JWT usando Passport. Su función es interceptar las peticiones 
// HTTP con un Token, verificar que la firma del token sea válida con la clave secreta y buscar al usuario en la 
// base de datos para asegurar que existe y está activo. Si todo está bien, adjunta el usuario al objeto request de 
// Express/NestJS.

// Importaciones de NestJS, Passport, TypeORM y tipos de TypeScript
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ExtractJwt, Strategy } from "passport-jwt";

import { User } from "../entities/user.entity";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

// Decorador que permite a NestJS inyectar esta clase como un proveedor de servicios
@Injectable()
// Extiende de PassportStrategy indicándole que usará la estrategia 'Strategy' de passport-jwt
export class JwtStrategy extends PassportStrategy(Strategy) {

    constructor(
        // Inyecta el repositorio de TypeORM para realizar consultas a la tabla de usuarios
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,

        // Inyecta el servicio de configuración para acceder a las variables de entorno (.env)
        configService: ConfigService,
    ){
        // Obtiene el valor de la variable de entorno JWT_SECRET como string
        const jwtSecret = configService.get<string>('JWT_SECRET');

        // Si la variable de entorno no está definida, detiene la aplicación con un error explícito
        if(!jwtSecret) throw new Error('JWT_SECRET is not defined in environment variables');

        // Llama al constructor padre (PassportStrategy / Strategy) pasando la configuración clave
        super({
            // Le indica a Passport cuál es la clave secreta para verificar y desencriptar el JWT
            secretOrKey: jwtSecret,
            // Extrae el token directamente de los Headers HTTP buscando la cabecera 'Authorization: Bearer <token>'
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        });
    }

    // Método obligatorio de la estrategia: se ejecuta automátiamente tras verificar exitosamente el token
    async validate(payload: JwtPayload): Promise<User> {
        // Extrae la propiedad 'id' almacenada en la información (payload) del JWT
        const { id } = payload;

        // Busca el usuario en la base de datos por el id extraído
        const user = await this.userRepository.findOneBy({ id });

        // Si el usuario no existe en la BD, rechaza la petición con una excepción HTTP 401 Unauthorized
        if(!user) throw new UnauthorizedException('Token not valid');
        
        // Si la cuenta del usuario está desactivada, también rechaza la petición con HTTP 401 Unauthorized
        if(!user.isActive) throw new UnauthorizedException('User is inactive');

        // Retorna el usuario. NestJS automáticamente lo inyecta en la petición HTTP (req.user)
        return user;
    }
}