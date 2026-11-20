const { getStore } = require('@netlify/blobs');

const SEED = {
  restaurantName: "Suzie Cakes And Events",
  menu: [
    { id: 1, name: "Beef Shawarma", desc: "Juicy tender beef, fresh veggies, creamy sauce", price: 500, emoji: "🌯" },
    { id: 2, name: "Chicken Shawarma", desc: "Juicy chicken, fresh wrap, cold drink", price: 500, emoji: "🌯" },
    { id: 3, name: "Juicy T-Bone Steak", desc: "Served with golden chips, veggies, creamy sauce, dessert + cold drink", price: 2500, emoji: "🥩" },
    { id: 4, name: "Full English Breakfast", desc: "2 eggs, sausages, bacon, beans, tomato, mushrooms, toast + tea/coffee", price: 1500, emoji: "🍳" },
    { id: 5, name: "Prawn Dish", desc: "Hot & fresh prawns, Eat Good Feel Good", price: 2100, emoji: "🍤" },
    { id: 6, name: "Milkshake", desc: "Oreo, Vanilla or Chocolate — thick, creamy, ice cold", price: 850, emoji: "🥤" },
    { id: 7, name: "Beef Burger", desc: "Yummy burger with all the trimmings", price: 1200, emoji: "🍔" },
    { id: 8, name: "Chocolate Cake Slice", desc: "Rich, moist chocolate cake — fresh daily", price: 700, emoji: "🍰" },
    { id: 9, name: "Fresh Celebration Cake", desc: "Birthdays, weddings, anniversaries — baked to order", price: 8500, emoji: "🎂" }
  ],
  gallery: [
    { id: 1, url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80", caption: "Chocolate celebration cake" },
    { id: 2, url: "https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=800&q=80", caption: "Vanilla birthday cake" },
    { id: 3, url: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=80", caption: "Strawberry shortcake" },
    { id: 4, url: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&q=80", caption: "Wedding cake" },
    { id: 5, url: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&q=80", caption: "Cupcakes & pastries" },
    { id: 6, url: "https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=800&q=80", caption: "Sizzling T-Bone" }
  ],
  theme: { primary: "#d81b60", bg: "#fff5f7", text: "#3a1f2b", accent: "#ffd1dc", pattern: "none" },
  customHtml: ""
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const store = getStore({ 
      name: 'suzie-cakes', 
      consistency: 'strong',
      siteID: process.env.1cc111ef-3bdc-46ea-99a8-8852e019d8f5,
      token: process.env.nfp_m97p8VHp5r8B5kn4kqL6ePAYhqi5dD2G9af6
    });
    
    let data = await store.get('data.json', { type: 'json' });

    if (!data) {
      data = SEED;
      await store.setJSON('data.json', data);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60'
      },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to load data', details: err.message })
    };
  }
};
