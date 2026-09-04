-- Run after schema.sql. Prices are stored in paise and initial stock is zero.
insert into public.categories(name,slug,sort_order) values
('Kanji Powders','kanji-powders',1),('Podi Varieties','podi-varieties',2),('Spices & Masalas','spices-and-masalas',3),
('Pickles & Thokku','pickles-and-thokku',4),('Rice Mix Pastes','rice-mix-pastes',5),('Ladoos','ladoos',6),
('Snacks','snacks',7),('Herbal Products','herbal-products',8)
on conflict(slug) do update set name=excluded.name,sort_order=excluded.sort_order;

with catalogue(category,name,slug,sku,label,price_paise) as (values
('Kanji Powders','Karuppu Kavuni Rice Kanji Powder','karuppu-kavuni-rice-kanji-powder','VH-KAN-001','250 g',15900),
('Kanji Powders','Multi Millet Kanji Powder','multi-millet-kanji-powder','VH-KAN-002','250 g',21900),
('Kanji Powders','Black Gram Kali Powder','black-gram-kali-powder','VH-KAN-003','250 g',16900),
('Kanji Powders','Sprout Millet Kanji Powder','sprout-millet-kanji-powder','VH-KAN-004','250 g',22500),
('Kanji Powders','Protein Powder','protein-powder','VH-KAN-005','250 g',34900),
('Podi Varieties','Idli Milaga Podi','idli-milaga-podi','VH-POD-001','250 g',19000),
('Podi Varieties','Paruppu Sadam Podi','paruppu-sadam-podi','VH-POD-002','250 g',16900),
('Podi Varieties','Ramasery Idli Podi','ramasery-idli-podi','VH-POD-003','250 g',16900),
('Podi Varieties','Horse Gram Idli Podi','horse-gram-idli-podi','VH-POD-004','250 g',16900),
('Podi Varieties','Horse Gram Rice Podi','horse-gram-rice-podi','VH-POD-005','250 g',15900),
('Spices & Masalas','Omelette Masala Powder','omelette-masala-powder','VH-MAS-001','250 g',22900),
('Spices & Masalas','Pepper Powder','pepper-powder','VH-MAS-002','250 g',24900),
('Spices & Masalas','Cumin Powder','cumin-powder','VH-MAS-003','250 g',12900),
('Spices & Masalas','Onion Powder','onion-powder','VH-MAS-004','250 g',15900),
('Spices & Masalas','Garlic Powder','garlic-powder','VH-MAS-005','250 g',21900),
('Spices & Masalas','Dry Ginger Powder','dry-ginger-powder','VH-MAS-006','250 g',25900),
('Spices & Masalas','Sprouted Fenugreek Powder','sprouted-fenugreek-powder','VH-MAS-007','250 g',11900),
('Spices & Masalas','Kozhambu Milagai Thool','kozhambu-milagai-thool','VH-MAS-008','250 g',17500),
('Pickles & Thokku','Garlic Pickle','garlic-pickle','VH-PIC-001','250 g',16900),
('Pickles & Thokku','Ginger Pickle','ginger-pickle','VH-PIC-002','250 g',16900),
('Pickles & Thokku','Tomato Pickle','tomato-pickle','VH-PIC-003','250 g',19900),
('Pickles & Thokku','Mango Thokku','mango-thokku','VH-PIC-004','250 g',14900),
('Pickles & Thokku','Kariveppilai Thokku','kariveppilai-thokku','VH-PIC-005','250 g',17900),
('Pickles & Thokku','Gongura Thokku','gongura-thokku','VH-PIC-006','250 g',17900),
('Rice Mix Pastes','Puliyodharai Paste','puliyodharai-paste','VH-RIC-001','250 g',14900),
('Rice Mix Pastes','Lemon Rice Paste','lemon-rice-paste','VH-RIC-002','250 g',11900),
('Ladoos','Peanut Ladoo','peanut-ladoo','VH-LAD-001','250 g',15900),
('Ladoos','Pottu Kadalai Ladoo','pottu-kadalai-ladoo','VH-LAD-002','250 g',17900),
('Ladoos','Dry Fruits Ladoo','dry-fruits-ladoo','VH-LAD-003','250 g',34900),
('Ladoos','Thinai Ladoo','thinai-ladoo','VH-LAD-004','250 g',14900),
('Ladoos','Ragi Ladoo','ragi-ladoo','VH-LAD-005','250 g',16900),
('Snacks','Dry Fruits & Nuts Fry Mix (Salted)','dry-fruits-and-nuts-fry-mix-salted','VH-SNA-001','250 g',39900),
('Herbal Products','Herbal Hair Oil','herbal-hair-oil','VH-HER-001','100 ml',9100),
('Herbal Products','Herbal Bath Powder','herbal-bath-powder','VH-HER-002','250 g',22900)
), inserted as (
  insert into public.products(category_id,name,slug,sku,short_description)
  select c.id,x.name,x.slug,x.sku,'Homemade in small batches by Vedha.' from catalogue x join public.categories c on c.name=x.category
  on conflict(slug) do update set name=excluded.name,category_id=excluded.category_id,sku=excluded.sku
  returning id,slug
)
insert into public.product_variants(product_id,label,sku,price_paise,stock_quantity)
select p.id,x.label,x.sku||'-'||upper(replace(x.label,' ','')),x.price_paise,0
from catalogue x join public.products p on p.slug=x.slug
on conflict(sku) do update set label=excluded.label,price_paise=excluded.price_paise;
