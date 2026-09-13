import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';

import { isUUID } from 'class-validator';
import { ProductImage, Product } from './entities';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductService'); //para mostrar los errores de forma mas clara
  private list_products: Product[] = [];

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource,
  ){}

  async create(createProductDto: CreateProductDto, user: User) {
    try{
      const {images = [], ...productDetails} = createProductDto;

      const product = this.productRepository.create({
        ...productDetails,
        images: images.map( image => this.productImageRepository.create({url: image})),
        user: user
      });
      await this.productRepository.save(product);

      return {...product, images};
    } catch(error){
      this.handleDBExceptions(error);
      //this.logger.error(error);
      throw new InternalServerErrorException('ayuda!');
    }
  }

  async findAll(paginationDto: PaginationDto) {

    const {limit = 10, offset = 0} = paginationDto;

    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      relations: {
        images: true
      }
    });

    return products.map(product => ({
      ...product,
      images: product.images?.map(img => img.url)
    }))

    // this.list_products = await this.productRepository.find({});
    // if(this.list_products.length > 0){
    //   return this.list_products;
    // }else{
    //   throw new NotFoundException('No products were found.');
    // }
  }

  async findOne(term: string): Promise<Product> {
    let product: Product | null;

    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder('prod');
      product = await queryBuilder
        .where('UPPER(title) =:title or slug =:slug', {
          title: term.toUpperCase(),
          slug: term.toLowerCase(),
        })
        .leftJoinAndSelect('prod.images', 'prodImages')
        .getOne();
    }

    if (!product) {
      throw new NotFoundException(`Product with term ${term} not found`);
    }

    return product;
  }

  async findOnePlain(term: string){
    const {images = [], ...rest} = await this.findOne(term);
    return {
      ...rest,
      images: images.map(img => img.url)
    }
  }

  // async findOne(term: string): Promise<Product> {
  //     // el siguiente nos sirve solo si buscamos por lo mismo, todo strings por ejemplo, pero como en este caso
  //     // term puede ser uuid o string no nos vale
  //     // const product = await this.productRepository.findOne({
  //     //   where: [
  //     //     {id: term},
  //     //     {slug: term}
  //     //   ],
  //     // });

  //   //este si si es diferente
  //   let product: Product;

  //   if (isUUID(term)) {
  //     product = await this.productRepository.findOneBy({ id: term });
  //   } else {
  //     // Usamos QueryBuilder 
  //     const queryBuilder = this.productRepository.createQueryBuilder('prod');
  //     product = await queryBuilder
  //       .where('UPPER(title) =:title or slug =:slug', {
  //         title: term.toUpperCase(),
  //         slug: term.toLowerCase(),
  //       })
  //       .getOne();
  //   }

  //   // const product = isUUID(term)
  //   //   ? await this.productRepository.findOneBy({id: term})
  //   //   : await this.productRepository.findOneBy({slug: term});

  //   // if(!product){
  //   //   throw new NotFoundException(`Product with term ${term} not found`)
  //   // }

  //   return product;
  // }

  async update(id: string, updateProductDto: UpdateProductDto, user: User) {
    
    const { images, ...toUpdate} = updateProductDto;
    const product = await this.productRepository.preload({
      id, // buscamos un producto por el id
      ...toUpdate // si existe le otorga los atriutos cambiados del dto al objeto de la bd,
    });
    if (!product) throw new NotFoundException(`Product with id: ${id} not found`);

    // Create Query runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if(images){
        await queryRunner.manager.delete(ProductImage, {product: {id}})
        
        product.images = images.map(
          img => this.productImageRepository.create({url: img})
        )
      }
      product.user = user;
      
      await queryRunner.manager.save(product);
      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOnePlain(id);

      //await this.productRepository.save(product);
      //return product;
    } catch (error) {

      await queryRunner.rollbackTransaction();
      await queryRunner.release();

      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepository.remove(product); // Puedes usar .remove(product) o .delete(product.id)
    return `Product has been deleted`;
  }

  async deleteAllProducts(){
    const query = this.productRepository.createQueryBuilder('product');

    try{
      return await query
        .delete()
        .execute()
    }catch(error){
      this.handleDBExceptions(error);
    }
  }

  // Método privado centralizado para errores de base de datos
  private handleDBExceptions(error: any) {
    // Código 23505 = Registro duplicado en PostgreSQL (Unique constraint)
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }

    // Si es un error desconocido, imprimimos solo el objeto formateado
    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs');
  }

}
