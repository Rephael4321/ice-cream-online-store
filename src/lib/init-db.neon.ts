import pool from "./db.neon";

export async function initializeTables() {
  const connection = await pool.connect();

  try {
    // === Trigger function ===
    await connection.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem';
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // === Tables ===
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        price NUMERIC(10,2),
        image TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem',
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem'
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER,
        sale_price NUMERIC(10,2),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem',
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem'
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type TEXT CHECK (type IN ('collection', 'sale')),
        image TEXT,
        parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        show_in_menu BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem',
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem'
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS category_sales (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        sale_price NUMERIC(10,2) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem',
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem'
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_categories (
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, category_id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem',
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem'
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem',
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem'
      );
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
        product_image TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem',
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem'
      );
    `);

    // === Attach updated_at triggers ===
    const tables = [
      "products",
      "sales",
      "categories",
      "category_sales",
      "product_categories",
      "orders",
      "order_items",
    ];

    for (const table of tables) {
      await connection.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = '${table}_updated_at'
          ) THEN
            CREATE TRIGGER ${table}_updated_at
            BEFORE UPDATE ON ${table}
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at();
          END IF;
        END$$;
      `);
    }

    // === Views with local time (from UTC) ===
    await connection.query(`
      CREATE OR REPLACE VIEW orders_local AS
      SELECT
        id,
        phone,
        created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
        updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at
      FROM orders;

      CREATE OR REPLACE VIEW products_local AS
      SELECT
        *,
        created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_local,
        updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_local
      FROM products;
    `);

    console.log("✅ Tables, triggers, and views initialized");
  } catch (err) {
    console.error("❌ Error initializing tables:", err);
    throw err;
  } finally {
    connection.release();
  }
}
