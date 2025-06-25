interface Sale {
  amount: number;
  price: number;
}

type Sales = {
  [productId: number]: Sale;
};

export const IceCreamsProducts = [
  { id: 1, image: "/ice-scream.png", name: "גלידת שוקולד קלאסי", price: 12 },
  { id: 2, image: "/ice-scream.png", name: "גלידת וניל חלום", price: 11 },
  { id: 3, image: "/ice-scream.png", name: "גלידת תות מתוק", price: 13 },
  { id: 4, image: "/ice-scream.png", name: "גלידת פיסטוק טבעי", price: 14 },
  { id: 5, image: "/ice-scream.png", name: "גלידת בננה שמנת", price: 12 },
  { id: 6, image: "/ice-scream.png", name: "גלידת מנגו קיץ", price: 13 },
  { id: 7, image: "/ice-scream.png", name: "גלידת קרמל מלוח", price: 14 },
  { id: 8, image: "/ice-scream.png", name: "גלידת קוקוס אקזוטי", price: 12 },
  { id: 9, image: "/ice-scream.png", name: "גלידת אגוזי לוז", price: 13 },
  { id: 10, image: "/ice-scream.png", name: "גלידת עוגיות שמנת", price: 14 },
  { id: 11, image: "/ice-scream.png", name: "גלידת שוקולד מריר", price: 13 },
  { id: 12, image: "/ice-scream.png", name: "גלידת נוגט חמה", price: 12 },
  { id: 13, image: "/ice-scream.png", name: "גלידת יוגורט פירות", price: 11 },
  { id: 14, image: "/ice-scream.png", name: "גלידת קינמון חורפי", price: 13 },
  { id: 15, image: "/ice-scream.png", name: "גלידת לימון רענן", price: 11 },
];

export const PopsiclesProducts = [
  { id: 1, image: "/popsicle.png", name: "פטליה שוקולד", price: 10 },
  { id: 2, image: "/popsicle.png", name: "וניל וניל", price: 9 },
  { id: 3, image: "/popsicle.png", name: "תות שדה מתוק", price: 11 },
  { id: 4, image: "/popsicle.png", name: "פיסטוק מרענן", price: 12 },
  { id: 5, image: "/popsicle.png", name: "בננה קרירה", price: 10 },
  { id: 6, image: "/popsicle.png", name: "מנגו טרופי", price: 11 },
  { id: 7, image: "/popsicle.png", name: "קרמל מלוח", price: 12 },
  { id: 8, image: "/popsicle.png", name: "קוקוס אקזוטי", price: 10 },
  { id: 9, image: "/popsicle.png", name: "אגוזי לוז פריכים", price: 11 },
  { id: 10, image: "/popsicle.png", name: "עוגיות שמנת", price: 12 },
  { id: 11, image: "/popsicle.png", name: "שוקולד מריר", price: 11 },
  { id: 12, image: "/popsicle.png", name: "נוגט חם", price: 10 },
  { id: 13, image: "/popsicle.png", name: "יוגורט פירות", price: 9 },
  { id: 14, image: "/popsicle.png", name: "קינמון חורפי", price: 11 },
  { id: 15, image: "/popsicle.png", name: "לימון רענן", price: 9 },
];

export const IceCreamsSales: Sales = {
  2: { amount: 3, price: 25 },
  5: { amount: 2, price: 18 },
  9: { amount: 4, price: 40 },
  14: { amount: 3, price: 30 },
};

export const PopsiclesSales: Sales = {
  1: { amount: 5, price: 35 },
  6: { amount: 3, price: 27 },
  10: { amount: 4, price: 40 },
  15: { amount: 2, price: 13 },
};
