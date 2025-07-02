// lib/init-db.ts
import pool from "./db.neon";

export async function initializeTables() {
  const connection = await pool.connect();

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        price NUMERIC(10,2),
        image TEXT
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER,
        sale_price NUMERIC(10,2)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type TEXT CHECK (type IN ('collection', 'sale')),
        image TEXT,
        parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        show_in_menu BOOLEAN DEFAULT FALSE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS category_sales (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        sale_price NUMERIC(10,2) NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_categories (
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, category_id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_name VARCHAR(255),
        quantity INTEGER NOT NULL,
        unit_price NUMERIC(10,2),
        sale_quantity INTEGER,
        sale_price NUMERIC(10,2),
        product_image TEXT
      )
    `);
  } catch (err) {
    console.error("Error initializing tables:", err);
    throw err;
  } finally {
    connection.release();
  }
}
