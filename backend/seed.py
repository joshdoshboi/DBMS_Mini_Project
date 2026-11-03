from app.main import conn
with conn() as c:
 c.execute("INSERT INTO categories(category_name) VALUES('Audio'),('Accessories'),('Stationery'),('Storage') ON CONFLICT DO NOTHING")
 c.execute("INSERT INTO suppliers(supplier_name,email,phone) VALUES('Pixel Supply Co.','hello@pixelsupply.example','9000000001'),('RetroTech Wholesale','orders@retrotech.example','9000000002') ON CONFLICT DO NOTHING")
 c.execute("INSERT INTO customers(customer_name,email,phone) VALUES('Aarav Mehta','aarav@example.com','9000010001'),('Mira Shah','mira@example.com','9000010002') ON CONFLICT DO NOTHING")
 c.execute("""INSERT INTO products(product_name,category_id,supplier_id,price,stock_quantity,reorder_level)
 SELECT v.n,ca.category_id,s.supplier_id,v.price,v.qty,v.reorder FROM (VALUES
 ('USB-C Headphones','Audio','Pixel Supply Co.',1299.00,24,8),('Mechanical Keyboard','Accessories','RetroTech Wholesale',2499.00,6,10),('Pixel Notebook','Stationery','Pixel Supply Co.',199.00,42,12),('Desk Lamp Mini','Accessories','RetroTech Wholesale',899.00,9,10)) AS v(n,cat,sup,price,qty,reorder) JOIN categories ca ON ca.category_name=v.cat JOIN suppliers s ON s.supplier_name=v.sup WHERE NOT EXISTS(SELECT 1 FROM products p WHERE p.product_name=v.n)""")
print('Sample data ready')
