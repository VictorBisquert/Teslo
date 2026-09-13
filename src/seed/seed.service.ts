import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { initialData } from './data/seed-data';

@Injectable()
export class SeedService {

  constructor(
    private readonly productService: ProductsService
  ){}

  async runSeed() {
    await this.insertNewProducts();
    return `SEED EXECUTED`;
  }

  private async insertNewProducts(){
    await this.productService.deleteAllProducts();

    const products = initialData.products;

    // .map() crea el arreglo de promesas automáticamente con el tipo correcto
    // const insertPromises = products.map((product) =>
    //   this.productService.create(product),
    // );

    //await Promise.all(insertPromises);

    return true;
  }
}
