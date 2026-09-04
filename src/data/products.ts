export type Product = { id: number; slug: string; category: string; name: string; weight: string; price: number; stock: number; active: boolean };

const rows: Array<[string, string, string, number]> = [
  ["Kanji Powders", "Karuppu Kavuni Rice Kanji Powder", "250 g", 159], ["Kanji Powders", "Multi Millet Kanji Powder", "250 g", 219], ["Kanji Powders", "Black Gram Kali Powder", "250 g", 169], ["Kanji Powders", "Sprout Millet Kanji Powder", "250 g", 225], ["Kanji Powders", "Protein Powder", "250 g", 349],
  ["Podi Varieties", "Idli Milaga Podi", "250 g", 190], ["Podi Varieties", "Paruppu Sadam Podi", "250 g", 169], ["Podi Varieties", "Ramasery Idli Podi", "250 g", 169], ["Podi Varieties", "Horse Gram Idli Podi", "250 g", 169], ["Podi Varieties", "Horse Gram Rice Podi", "250 g", 159],
  ["Spices & Masalas", "Omelette Masala Powder", "250 g", 229], ["Spices & Masalas", "Pepper Powder", "250 g", 249], ["Spices & Masalas", "Cumin Powder", "250 g", 129], ["Spices & Masalas", "Onion Powder", "250 g", 159], ["Spices & Masalas", "Garlic Powder", "250 g", 219], ["Spices & Masalas", "Dry Ginger Powder", "250 g", 259], ["Spices & Masalas", "Sprouted Fenugreek Powder", "250 g", 119], ["Spices & Masalas", "Kozhambu Milagai Thool", "250 g", 175],
  ["Pickles & Thokku", "Garlic Pickle", "250 g", 169], ["Pickles & Thokku", "Ginger Pickle", "250 g", 169], ["Pickles & Thokku", "Tomato Pickle", "250 g", 199], ["Pickles & Thokku", "Mango Thokku", "250 g", 149], ["Pickles & Thokku", "Kariveppilai Thokku", "250 g", 179], ["Pickles & Thokku", "Gongura Thokku", "250 g", 179],
  ["Rice Mix Pastes", "Puliyodharai Paste", "250 g", 149], ["Rice Mix Pastes", "Lemon Rice Paste", "250 g", 119],
  ["Ladoos", "Peanut Ladoo", "250 g", 159], ["Ladoos", "Pottu Kadalai Ladoo", "250 g", 179], ["Ladoos", "Dry Fruits Ladoo", "250 g", 349], ["Ladoos", "Thinai Ladoo", "250 g", 149], ["Ladoos", "Ragi Ladoo", "250 g", 169],
  ["Snacks", "Dry Fruits & Nuts Fry Mix (Salted)", "250 g", 399], ["Herbal Products", "Herbal Hair Oil", "100 ml", 91], ["Herbal Products", "Herbal Bath Powder", "250 g", 229],
];

const slugify = (value: string) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Local seed for Step 1. A Supabase query will replace this export in the database milestone.
export const products: Product[] = rows.map(([category, name, weight, price], index) => ({ id: index + 1, slug: slugify(name), category, name, weight, price, stock: 12, active: true }));
export const categories = [...new Set(products.map((product) => product.category))];
