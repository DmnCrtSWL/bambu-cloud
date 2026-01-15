CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "cxc" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"amount" numeric(10, 2) NOT NULL,
	"sale_id" integer,
	"status" text DEFAULT 'Pending',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"paid_at" timestamp,
	"user_id" integer
);
--> statement-breakpoint
CREATE TABLE "fixed_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"concept" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"paid_to" text NOT NULL,
	"payment_method" text NOT NULL,
	"frequency" text NOT NULL,
	"expense_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"user_id" integer
);
--> statement-breakpoint
CREATE TABLE "inventory_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer,
	"order_id" integer,
	"product_name" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"recipe_id" integer,
	"price" numeric(10, 2) NOT NULL,
	"description" text,
	"variations" json,
	"category" text DEFAULT 'General' NOT NULL,
	"icon" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_name" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"notes" text,
	"options" json
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"delivery_time" text,
	"delivery_location" text,
	"payment_method" text,
	"notes" text,
	"status" text DEFAULT 'Nuevo',
	"total" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"product_name" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"category" text NOT NULL,
	"is_public" boolean DEFAULT true,
	"variations" json,
	"image_url" text,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sale_id" integer NOT NULL,
	"product_name" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"payment_method" text NOT NULL,
	"customer_name" text,
	"customer_phone" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp,
	"user_id" integer
);
--> statement-breakpoint
CREATE TABLE "ticket_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"product" text NOT NULL,
	"quantity" numeric(15, 6) NOT NULL,
	"unit" text NOT NULL,
	"unit_price" numeric(15, 6) NOT NULL,
	"discount" numeric(15, 6) DEFAULT '0',
	"total" numeric(15, 6) NOT NULL,
	"type" text DEFAULT 'Insumo'
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_ref" text NOT NULL,
	"provider" text NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"payment_method" text NOT NULL,
	"status" text DEFAULT 'No Desglosado',
	"purchase_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp,
	"user_id" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text NOT NULL,
	"access_pin" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cxc" ADD CONSTRAINT "cxc_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cxc" ADD CONSTRAINT "cxc_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_usage" ADD CONSTRAINT "inventory_usage_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_usage" ADD CONSTRAINT "inventory_usage_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_items" ADD CONSTRAINT "ticket_items_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cxc_status_idx" ON "cxc" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cxc_customer_phone_idx" ON "cxc" USING btree ("customer_phone");--> statement-breakpoint
CREATE INDEX "cxc_sale_id_idx" ON "cxc" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "fixed_expenses" USING btree ("expense_date");--> statement-breakpoint
CREATE INDEX "inv_usage_sale_id_idx" ON "inventory_usage" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "inv_usage_order_id_idx" ON "inventory_usage" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "inv_usage_product_name_idx" ON "inventory_usage" USING btree ("product_name");--> statement-breakpoint
CREATE INDEX "menu_items_recipe_id_idx" ON "menu_items" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_phone_idx" ON "orders" USING btree ("customer_phone");--> statement-breakpoint
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_items_product_name_idx" ON "sale_items" USING btree ("product_name");--> statement-breakpoint
CREATE INDEX "sales_created_at_idx" ON "sales" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sales_payment_method_idx" ON "sales" USING btree ("payment_method");--> statement-breakpoint
CREATE INDEX "sales_customer_phone_idx" ON "sales" USING btree ("customer_phone");--> statement-breakpoint
CREATE INDEX "ticket_items_ticket_id_idx" ON "ticket_items" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_items_product_idx" ON "ticket_items" USING btree ("product");--> statement-breakpoint
CREATE INDEX "tickets_purchase_date_idx" ON "tickets" USING btree ("purchase_date");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tickets_ref_idx" ON "tickets" USING btree ("ticket_ref");