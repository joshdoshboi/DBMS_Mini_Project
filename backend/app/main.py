import os
from decimal import Decimal
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
load_dotenv()
DB=os.getenv('DATABASE_URL','postgresql://postgres:postgres@localhost:5432/inventory_db')
app=FastAPI(title='Inventory & Order Management')
app.add_middleware(CORSMiddleware,allow_origins=['http://127.0.0.1:5500','http://localhost:5500','null'],allow_methods=['*'],allow_headers=['*'])
def conn(): return psycopg.connect(DB,row_factory=dict_row)
def rows(cur):
 def clean(x):
  if isinstance(x,Decimal): return float(x)
  if isinstance(x,dict): return {k:clean(v) for k,v in x.items()}
  if isinstance(x,list): return [clean(v) for v in x]
  return x
 return clean(cur.fetchall())
def one(cur):
 r=cur.fetchone()
 if r is None:return None
 def clean(x):
  if isinstance(x,Decimal):return float(x)
  if isinstance(x,dict):return {k:clean(v) for k,v in x.items()}
  return x
 return clean(r)
class Category(BaseModel): category_name:str=Field(min_length=1,max_length=100)
class Supplier(BaseModel): supplier_name:str=Field(min_length=1,max_length=150); email:str|None=None; phone:str|None=None
class Customer(BaseModel): customer_name:str=Field(min_length=1,max_length=150); email:str|None=None; phone:str|None=None
class Product(BaseModel): product_name:str=Field(min_length=1,max_length=150); category_id:int; supplier_id:int; price:Decimal=Field(ge=0,max_digits=10,decimal_places=2); stock_quantity:int=Field(ge=0); reorder_level:int=Field(default=10,ge=0); is_active:bool=True
class Line(BaseModel): product_id:int; quantity:int=Field(gt=0)
class NewOrder(BaseModel): customer_id:int; items:list[Line]=Field(min_length=1)
class Status(BaseModel): status:str
@app.get('/api/health')
def health():
 try:
  with conn() as c:c.execute('SELECT 1')
  return {'status':'ok','database':'connected'}
 except Exception:raise HTTPException(503,'Check PostgreSQL and backend/.env')
@app.post('/api/categories',status_code=201)
def add_category(d:Category):
 with conn() as c:return one(c.execute('INSERT INTO categories(category_name) VALUES(%s) RETURNING *',(d.category_name,)))
@app.put('/api/categories/{i}')
def edit_category(i:int,d:Category):
 with conn() as c:
  r=one(c.execute('UPDATE categories SET category_name=%s WHERE category_id=%s RETURNING *',(d.category_name,i)))
  if not r:raise HTTPException(404,'Category not found')
  return r
@app.delete('/api/categories/{i}',status_code=204)
def del_category(i:int):
 with conn() as c:
  if not c.execute('DELETE FROM categories WHERE category_id=%s RETURNING category_id',(i,)).fetchone():raise HTTPException(404,'Category not found')
 return Response(status_code=204)
@app.post('/api/suppliers',status_code=201)
def add_supplier(d:Supplier):
 with conn() as c:return one(c.execute('INSERT INTO suppliers(supplier_name,email,phone) VALUES(%s,%s,%s) RETURNING *',(d.supplier_name,d.email or None,d.phone or None)))
@app.put('/api/suppliers/{i}')
def edit_supplier(i:int,d:Supplier):
 with conn() as c:
  r=one(c.execute('UPDATE suppliers SET supplier_name=%s,email=%s,phone=%s WHERE supplier_id=%s RETURNING *',(d.supplier_name,d.email or None,d.phone or None,i)))
  if not r:raise HTTPException(404,'Supplier not found')
  return r
@app.delete('/api/suppliers/{i}',status_code=204)
def del_supplier(i:int):
 with conn() as c:
  if not c.execute('DELETE FROM suppliers WHERE supplier_id=%s RETURNING supplier_id',(i,)).fetchone():raise HTTPException(404,'Supplier not found')
 return Response(status_code=204)
@app.post('/api/customers',status_code=201)
def add_customer(d:Customer):
 with conn() as c:return one(c.execute('INSERT INTO customers(customer_name,email,phone) VALUES(%s,%s,%s) RETURNING *',(d.customer_name,d.email or None,d.phone or None)))
@app.put('/api/customers/{i}')
def edit_customer(i:int,d:Customer):
 with conn() as c:
  r=one(c.execute('UPDATE customers SET customer_name=%s,email=%s,phone=%s WHERE customer_id=%s RETURNING *',(d.customer_name,d.email or None,d.phone or None,i)))
  if not r:raise HTTPException(404,'Customer not found')
  return r
@app.delete('/api/customers/{i}',status_code=204)
def del_customer(i:int):
 with conn() as c:
  if not c.execute('DELETE FROM customers WHERE customer_id=%s RETURNING customer_id',(i,)).fetchone():raise HTTPException(404,'Customer not found')
 return Response(status_code=204)
@app.post('/api/products',status_code=201)
def add_product(d:Product):
 with conn() as c:return one(c.execute('INSERT INTO products(product_name,category_id,supplier_id,price,stock_quantity,reorder_level,is_active) VALUES(%s,%s,%s,%s,%s,%s,%s) RETURNING *',(d.product_name,d.category_id,d.supplier_id,d.price,d.stock_quantity,d.reorder_level,d.is_active)))
@app.put('/api/products/{i}')
def edit_product(i:int,d:Product):
 with conn() as c:
  r=one(c.execute('UPDATE products SET product_name=%s,category_id=%s,supplier_id=%s,price=%s,stock_quantity=%s,reorder_level=%s,is_active=%s WHERE product_id=%s RETURNING *',(d.product_name,d.category_id,d.supplier_id,d.price,d.stock_quantity,d.reorder_level,d.is_active,i)))
  if not r:raise HTTPException(404,'Product not found')
  return r
@app.delete('/api/products/{i}',status_code=204)
def del_product(i:int):
 with conn() as c:
  if not c.execute('DELETE FROM products WHERE product_id=%s RETURNING product_id',(i,)).fetchone():raise HTTPException(404,'Product not found')
 return Response(status_code=204)
@app.get('/api/orders')
def orders():
 with conn() as c:return rows(c.execute('SELECT o.order_id,c.customer_name,o.order_date,o.status,COALESCE(SUM(i.quantity*i.unit_price),0) total_amount,COALESCE(SUM(i.quantity),0) total_units FROM orders o JOIN customers c USING(customer_id) LEFT JOIN order_items i USING(order_id) GROUP BY o.order_id,c.customer_name ORDER BY o.order_date DESC'))
@app.get('/api/orders/{i}')
def order_detail(i:int):
 with conn() as c:
  o=one(c.execute('SELECT o.*,c.customer_name FROM orders o JOIN customers c USING(customer_id) WHERE order_id=%s',(i,)))
  if not o:raise HTTPException(404,'Order not found')
  o['items']=rows(c.execute('SELECT p.product_name,i.quantity,i.unit_price,i.quantity*i.unit_price line_total FROM order_items i JOIN products p USING(product_id) WHERE i.order_id=%s',(i,)))
  o['total_amount']=sum(x['line_total'] for x in o['items']);return o
@app.post('/api/orders',status_code=201)
def add_order(d:NewOrder):
 # psycopg connection context commits all changes together or rolls them back on an exception.
 with conn() as c:
  if not c.execute('SELECT 1 FROM customers WHERE customer_id=%s',(d.customer_id,)).fetchone():raise HTTPException(400,'Choose a valid customer')
  merged={}
  for x in d.items:merged[x.product_id]=merged.get(x.product_id,0)+x.quantity
  ids=sorted(merged);ps=rows(c.execute('SELECT product_id,product_name,price,stock_quantity,is_active FROM products WHERE product_id=ANY(%s) ORDER BY product_id FOR UPDATE',(ids,)));by={p['product_id']:p for p in ps}
  if len(by)!=len(ids):raise HTTPException(400,'A product does not exist')
  for pid,q in merged.items():
   p=by[pid]
   if not p['is_active']:raise HTTPException(400,p['product_name']+' is inactive')
   if p['stock_quantity']<q:raise HTTPException(409,'Insufficient stock for '+p['product_name'])
  o=one(c.execute("INSERT INTO orders(customer_id,status) VALUES(%s,'Confirmed') RETURNING *",(d.customer_id,)))
  for pid,q in merged.items():
   p=by[pid];c.execute('INSERT INTO order_items(order_id,product_id,quantity,unit_price) VALUES(%s,%s,%s,%s)',(o['order_id'],pid,q,p['price']));c.execute('UPDATE products SET stock_quantity=stock_quantity-%s WHERE product_id=%s',(q,pid))
  return {'order_id':o['order_id'],'status':o['status'],'message':'Order created and stock deducted'}
@app.patch('/api/orders/{i}/status')
def set_status(i:int,d:Status):
 if d.status not in {'Pending','Confirmed','Shipped','Delivered','Cancelled'}:raise HTTPException(400,'Invalid status')
 with conn() as c:
  o=one(c.execute('SELECT * FROM orders WHERE order_id=%s FOR UPDATE',(i,)))
  if not o:raise HTTPException(404,'Order not found')
  if o['status']=='Cancelled' and d.status!='Cancelled':raise HTTPException(409,'Cancelled order cannot be reopened')
  if d.status=='Cancelled' and o['status']!='Cancelled':
   for x in rows(c.execute('SELECT product_id,quantity FROM order_items WHERE order_id=%s',(i,))):c.execute('UPDATE products SET stock_quantity=stock_quantity+%s WHERE product_id=%s',(x['quantity'],x['product_id']))
  return one(c.execute('UPDATE orders SET status=%s WHERE order_id=%s RETURNING *',(d.status,i)))
@app.get('/api/dashboard')
def dashboard():
 with conn() as c:
  s=one(c.execute("SELECT (SELECT COUNT(*) FROM products WHERE is_active) total_products,(SELECT COALESCE(SUM(stock_quantity),0) FROM products WHERE is_active) stock_units,(SELECT COUNT(*) FROM products WHERE is_active AND stock_quantity<=reorder_level) low_stock,(SELECT COALESCE(SUM(i.quantity*i.unit_price),0) FROM order_items i JOIN orders o USING(order_id) WHERE o.status<>'Cancelled') order_value,(SELECT COUNT(*) FROM orders) total_orders,(SELECT COUNT(*) FROM customers) total_customers"))
  low=rows(c.execute('SELECT product_id,product_name,stock_quantity,reorder_level FROM products WHERE is_active AND stock_quantity<=reorder_level ORDER BY stock_quantity LIMIT 8'))
  best=rows(c.execute("SELECT p.product_name,COALESCE(SUM(CASE WHEN o.status<>'Cancelled' THEN i.quantity ELSE 0 END),0) units_sold FROM products p LEFT JOIN order_items i USING(product_id) LEFT JOIN orders o USING(order_id) GROUP BY p.product_id ORDER BY units_sold DESC LIMIT 5"))
  return {'stats':s,'low_stock_products':low,'best_sellers':best}
# Catch-all for simple tables; must stay last so it doesn't shadow /api/orders and /api/dashboard.
@app.get('/api/{table}')
def list_table(table:str):
 if table not in {'categories','suppliers','products','customers'}:raise HTTPException(404,'Unknown table')
 with conn() as c:
  if table=='products':return rows(c.execute('SELECT p.*,c.category_name,s.supplier_name FROM products p JOIN categories c USING(category_id) JOIN suppliers s USING(supplier_id) ORDER BY product_id DESC'))
  return rows(c.execute(f'SELECT * FROM {table} ORDER BY 1 DESC'))
# Serve the frontend from the same origin so the app works on one link with no CORS. Must be mounted last.
app.mount('/',StaticFiles(directory=os.path.join(os.path.dirname(__file__),'..','..','frontend'),html=True),name='frontend')
