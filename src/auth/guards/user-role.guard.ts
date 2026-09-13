// Este archivo es un Guardia de Autorización por Roles (UserRoleGuard). Su objetivo es controlar el acceso a 
// los endpoints leyendo los roles permitidos en los metadatos de la ruta y comprobando si el usuario que hace 
// la petición tiene al menos uno de esos roles.

// Importaciones de NestJS para interceptar la petición, leer metadatos y lanzar excepciones
import { Reflector } from '@nestjs/core';
import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { User } from '../entities/user.entity';
import { META_ROLES } from '../decorators/role-protected.decorator';

// Decorador que registra la clase en el contenedor de Inyección de Dependencias de NestJS
@Injectable()
// Implementa la interfaz CanActivate, obligatoria para que la clase funcione como un Guard en NestJS
export class UserRoleGuard implements CanActivate {

  constructor(
    // Inyecta Reflector, que permite leer la metadata adjunta a los controladores o métodos mediante decoradores
    private readonly reflector: Reflector
  ){}

  // Método principal que decide si se permite (true) o deniega (excepción / false) el acceso a la ruta
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {

    // Lee los roles permitidos adjuntos al método/controlador usando la clave META_ROLES
    const validRoles: string[] = this.reflector.get(META_ROLES, context.getHandler());

    // Si la ruta no define metadatos de roles (ej. no usa el decorador), permite el paso libremente
    if(!validRoles) return true;
    // Si la lista de roles definidos está vacía, también permite el paso
    if(validRoles.length === 0) return true;

    // Obtiene el objeto de la petición HTTP (Request) desde el contexto de ejecución
    const req = context.switchToHttp().getRequest();
    // Extrae el usuario previamente inyectado en el request (normalmente por JwtStrategy)
    const user = req.user as User;

    // Si no existe el usuario en la petición, lanza un error HTTP 400 Bad Request (Guard ejecutado antes de JwtStrategy o sin AuthGuard)
    if(!user) throw new BadRequestException('User not found');

    // Recorre cada uno de los roles que posee el usuario autenticado
    for (const role of user.roles) {
      // Si el usuario tiene al menos un rol de los permitidos en validRoles, concede acceso
      if(validRoles.includes(role)){
        return true;
      }
    }

    // Si el ciclo termina y ningún rol del usuario coincidió, lanza una excepción HTTP 403 Forbidden
    throw new ForbiddenException(`User ${user.fullName} need a valid role`);
  }
}