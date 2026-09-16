import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { initialData } from './data/seed-data';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class SeedService {
  constructor(
    private readonly productService: ProductsService,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async runSeed() {
    await this.deleteTables();

    const adminUser: User = await this.insertNewUsers(); //cogemos el usuario 0 y se lo pasamos a productos

    await this.insertNewProducts(adminUser);
    return `SEED EXECUTED`;
  }

  private async deleteTables() {
    await this.productService.deleteAllProducts();

    const queryBuilder = this.userRepository.createQueryBuilder();
    await queryBuilder.delete().where({}).execute();
  }

  private async insertNewUsers(): Promise<User> {
    //creamos e insertamos los usuarios
    const seedUsers = initialData.users;

    const users: User[] = [];

    seedUsers.forEach((user) => {
      users.push(this.userRepository.create(user));
    });

    const dbUsers = await this.userRepository.save(seedUsers);

    return dbUsers[0]; // retornamos el primer usuario
  }

  // creamos los productos, como el producto tiene UserId que necesitamos para saber quien lo ha creado pues le asignamos el usuario 0 de la lista
  private async insertNewProducts(user: User) {
    await this.productService.deleteAllProducts();

    const products = initialData.products;

    const insertPromises = [];

    // .map() crea el arreglo de promesas automáticamente con el tipo correcto
    // const insertPromises = products.map((product) =>
    //   this.productService.create(product),
    // );

    products.forEach((product) => {
      insertPromises.push(this.productService.create(product, user));
    });

    //await Promise.all(insertPromises);

    return true;
  }
}
