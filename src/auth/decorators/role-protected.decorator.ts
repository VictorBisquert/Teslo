import { SetMetadata } from '@nestjs/common';
//import { Reflector } from '@nestjs/core';
import { ValidRoles } from '../interfaces';

export const META_ROLES = 'roles';

//export const RoleProtected = Reflector.createDecorator<string[]>();
export const RoleProtected = (...args: ValidRoles[]) => {


    return SetMetadata(META_ROLES, args);
}
