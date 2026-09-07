import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ProductImage } from "./";


@Entity()
export class Product {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text', {
        unique: true
    })
    title: string;

    @Column('float', {
        default: 0
    })
    price: number;

    @Column({
        type: 'text',
        nullable: true
    })
    description: string;

    @Column('text', {
        unique: true
    })
    slug: string;

    @Column('numeric', {
        default: 0
    })
    stock: number;

    @Column('text', {
        array: true
    })
    sizes: string[];

    @Column('text')
    gender: string;

    @Column('text', {
        array: true,
        default: []
    })
    tags: string[];

    // images
    @OneToMany(
        () => ProductImage,
        (productImage) => productImage.product,
        {cascade: true, eager: true} //con eager cada vez que usemos un metodo find en el servicio, al cargar un producto o productos carga sus imagenes
    )
    images?: ProductImage[];


    @BeforeInsert() //comprobamos si el objeto tiene slug, si tiene perfecto sino cogemos el title
    ckeckSlugInsert(){
        if(!this.slug){
            this.slug = this.title;
        }

        this.slug = this.slug
            .toLowerCase()
            .replaceAll(' ','_')
            .replaceAll("'", '')
    }

    @BeforeUpdate()
    ckeckSlugUpdate(){
        this.slug = this.slug
            .toLowerCase()
            .replaceAll(' ','_')
            .replaceAll("'", '')
    }
}
