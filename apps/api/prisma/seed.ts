import { PrismaClient,Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
const db=new PrismaClient();
async function main(){if (process.env.NODE_ENV !== 'production' && !process.argv.includes('--catalog-only')) {
const passwordHash=await bcrypt.hash('BrewLite123!',10);for(const [email,name,role] of [['customer@brewlite.local','BrewLite Customer',Role.CUSTOMER],['staff@brewlite.local','BrewLite Staff',Role.STAFF]] as const)await db.user.upsert({where:{email},update:{},create:{email,name,role,passwordHash}});
}
const menu=[['cloud-matcha','Cloud Matcha','Matcha Nhật, sữa yến mạch và kem mịn.','Matcha',49000],['brown-sugar-latte','Brown Sugar Latte','Espresso, sữa tươi và đường nâu.','Coffee',45000],['cold-brew-orange','Cold Brew Cam','Cold brew ủ lạnh cùng cam tươi.','Coffee',52000],['strawberry-milk','Dâu Sữa','Dâu tây, sữa tươi và thạch dâu.','Tea',48000],['salted-caramel','Caramel Muối','Latte caramel cùng kem muối.','Coffee',50000],['jasmine-peach','Trà Đào Lài','Trà lài, đào ngâm và cam.','Tea',42000]] as const;
for (const [slug, name, description, category, price] of menu) {
  const image = `/drinks/${slug}.svg`;
  const small = { name: 'S', priceCents: price - 5000 };
  const product = await db.product.upsert({
    where: { slug },
    update: {},
    create: {
      slug, name, description, category, image, inventory: 100,
      sizes: { create: [small, { name: 'M', priceCents: price }, { name: 'L', priceCents: price + 10000 }] },
      toppings: { create: [
        { name: 'Trân châu', priceCents: 7000 },
        { name: 'Kem cheese', priceCents: 10000 },
        { name: 'Shot espresso', priceCents: 12000 },
      ] },
    },
  });
  await db.product.updateMany({ where: { id: product.id, image: null }, data: { image } });
  await db.productSize.upsert({
    where: { productId_name: { productId: product.id, name: 'S' } },
    update: {},
    create: { ...small, productId: product.id },
  });
}
await db.promotion.upsert({ where: { code: 'BREW10' }, update: {}, create: { code: 'BREW10', discountPercent: 10 } });
}
main().finally(() => db.$disconnect());
