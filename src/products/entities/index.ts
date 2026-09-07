export { ProductImage } from "./product-image.entity";
export { Product } from "./product.entity";

//Al exportar desde este archivo las entidades podemos usarlas en la misma importacion donde queramos usar las dos
//por ejemplo: en el product.module -> import { Product, ProductImage } from './entities';