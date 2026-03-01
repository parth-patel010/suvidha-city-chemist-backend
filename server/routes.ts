import type { Express } from "express";
  import { db } from "./db";
  import { 
    branches, users, roles, products, categories, manufacturers, suppliers,
    inventory, customers, sales, saleItems, onlineOrders, onlineOrderItems,
    purchaseOrders, purchaseOrderItems, loyaltyTiers, loyaltyTransactions,
    whatsappTemplates, whatsappMessages, expiryAlerts, stockAlerts, auditLogs
  } from "../shared/schema";
  import { eq, and, desc, sql, like, or, gte, lte, between } from "drizzle-orm";
  import bcrypt from "bcrypt";
  import jwt from "jsonwebtoken";
  import { whatsappService } from "./whatsapp";
  import { aiClient } from "./ai-client";

  const JWT_SECRET = process.env.SESSION_SECRET || "pharmacy-secret-key";

  // ============================================
  // MIDDLEWARE: Authentication
  // ============================================
  function authenticateToken(req: any, res: any, next: any) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    try {
      const verified = jwt.verify(token, JWT_SECRET);
      req.user = verified;
      next();
    } catch (error) {
      res.status(403).json({ error: "Invalid token" });
    }
  }

  // ============================================
  // ROUTES SETUP
  // ============================================
  export function registerRoutes(app: Express) {
    
    // ========== AUTHENTICATION ==========
    app.post("/api/auth/login", async (req, res) => {
      try {
        const { username, password } = req.body;
        
        const user = await db.query.users.findFirst({
          where: eq(users.username, username),
          with: { role: true, branch: true }
        });

        if (!user || !user.isActive) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        // Update last login
        await db.update(users)
          .set({ lastLogin: new Date() })
          .where(eq(users.id, user.id));

        const token = jwt.sign(
          { 
            id: user.id, 
            username: user.username, 
            roleId: user.roleId,
            branchId: user.branchId 
          },
          JWT_SECRET,
          { expiresIn: "24h" }
        );

        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            branch: user.branch
          }
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/auth/register", async (req, res) => {
      try {
        const { username, email, password, fullName, phone, roleId, branchId } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const [newUser] = await db.insert(users).values({
          username,
          email,
          passwordHash: hashedPassword,
          fullName,
          phone,
          roleId,
          branchId,
          isActive: true
        }).returning();

        res.status(201).json({ message: "User created successfully", userId: newUser.id });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // ========== DASHBOARD STATS ==========
    app.get("/api/dashboard/stats", authenticateToken, async (req: any, res) => {
      try {
        const branchId = req.user.branchId;

        // Today's sales
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const todaySales = await db
          .select({ total: sql`SUM(${sales.totalAmount})`, count: sql`COUNT(*)` })
          .from(sales)
          .where(and(
            eq(sales.branchId, branchId),
            gte(sales.saleDate, todayStart),
            eq(sales.status, "COMPLETED")
          ));

        // Yesterday's sales (for comparison)
        const yesterdayStart = new Date();
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(todayStart);

        const yesterdaySales = await db
          .select({ total: sql`SUM(${sales.totalAmount})`, count: sql`COUNT(*)` })
          .from(sales)
          .where(and(
            eq(sales.branchId, branchId),
            gte(sales.saleDate, yesterdayStart),
            lte(sales.saleDate, yesterdayEnd),
            eq(sales.status, "COMPLETED")
          ));

        // Low stock items
        const lowStockCount = await db
          .select({ count: sql`COUNT(*)` })
          .from(inventory)
          .where(and(
            eq(inventory.branchId, branchId),
            sql`${inventory.quantityInStock} <= ${inventory.reorderLevel}`
          ));

        // Expiring soon (within 30 days)
        const expiryThreshold = new Date();
        expiryThreshold.setDate(expiryThreshold.getDate() + 30);
        
        const expiringCount = await db
          .select({ count: sql`COUNT(*)` })
          .from(inventory)
          .where(and(
            eq(inventory.branchId, branchId),
            lte(inventory.expiryDate, expiryThreshold),
            gte(inventory.expiryDate, new Date())
          ));

        // Pending online orders
        const pendingOrdersCount = await db
          .select({ count: sql`COUNT(*)` })
          .from(onlineOrders)
          .where(and(
            eq(onlineOrders.branchId, branchId),
            or(
              eq(onlineOrders.status, "PENDING"),
              eq(onlineOrders.status, "CONFIRMED")
            )
          ));

        // Last 7 days sales trend
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const salesTrend = await db
          .select({
            date: sql<string>`DATE(${sales.saleDate})`,
            total: sql<string>`COALESCE(SUM(${sales.totalAmount}), 0)`,
            count: sql<number>`COUNT(*)`
          })
          .from(sales)
          .where(and(
            eq(sales.branchId, branchId),
            gte(sales.saleDate, sevenDaysAgo),
            eq(sales.status, "COMPLETED")
          ))
          .groupBy(sql`DATE(${sales.saleDate})`)
          .orderBy(sql`DATE(${sales.saleDate})`);

        // Recent 5 sales
        const recentSales = await db.query.sales.findMany({
          where: and(
            eq(sales.branchId, branchId),
            eq(sales.status, "COMPLETED")
          ),
          with: {
            customer: true,
            saleItems: {
              with: { product: true }
            }
          },
          orderBy: [desc(sales.saleDate)],
          limit: 5
        });

        // Expiry alerts (items expiring within 30 days)
        const expiryAlertItems = await db.query.inventory.findMany({
          where: and(
            eq(inventory.branchId, branchId),
            lte(inventory.expiryDate, expiryThreshold),
            gte(inventory.expiryDate, new Date()),
            sql`${inventory.quantityInStock} > 0`
          ),
          with: {
            product: true
          },
          orderBy: [inventory.expiryDate],
          limit: 10
        });

        res.json({
          todaySales: {
            total: todaySales[0]?.total || 0,
            count: todaySales[0]?.count || 0
          },
          yesterdaySales: {
            total: yesterdaySales[0]?.total || 0,
            count: yesterdaySales[0]?.count || 0
          },
          lowStockItems: lowStockCount[0]?.count || 0,
          expiringItems: expiringCount[0]?.count || 0,
          pendingOrders: pendingOrdersCount[0]?.count || 0,
          salesTrend,
          recentSales,
          expiryAlerts: expiryAlertItems
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ========== BRANCHES ==========
    app.get("/api/branches", authenticateToken, async (req, res) => {
      try {
        const allBranches = await db.query.branches.findMany({
          where: eq(branches.isActive, true),
          orderBy: [branches.branchName]
        });
        res.json(allBranches);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/branches", authenticateToken, async (req, res) => {
      try {
        const [newBranch] = await db.insert(branches).values(req.body).returning();
        res.status(201).json(newBranch);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // ========== PRODUCTS ==========
    app.get("/api/products", authenticateToken, async (req, res) => {
      try {
        const { search, categoryId, status } = req.query;
        let whereCondition: any = undefined;
        if (status === "active") {
          whereCondition = eq(products.isActive, true);
        } else if (status === "inactive") {
          whereCondition = eq(products.isActive, false);
        }

        let allProducts = await db.query.products.findMany({
          with: {
            category: true,
            manufacturer: true,
            inventory: true
          },
          where: whereCondition,
          orderBy: [products.productName]
        });

        // Apply filters
        if (search) {
          const searchTerm = search.toString().toLowerCase();
          allProducts = allProducts.filter(p => 
            p.productName.toLowerCase().includes(searchTerm) ||
            p.productCode.toLowerCase().includes(searchTerm) ||
            p.genericName?.toLowerCase().includes(searchTerm)
          );
        }

        if (categoryId) {
          allProducts = allProducts.filter(p => p.categoryId === parseInt(categoryId.toString()));
        }

        res.json(allProducts);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/api/products/:id", authenticateToken, async (req, res) => {
      try {
        const product = await db.query.products.findFirst({
          where: eq(products.id, parseInt(req.params.id)),
          with: {
            category: true,
            manufacturer: true,
            inventory: {
              with: { branch: true, supplier: true }
            }
          }
        });

        if (!product) {
          return res.status(404).json({ error: "Product not found" });
        }

        res.json(product);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/products", authenticateToken, async (req, res) => {
      try {
        const [newProduct] = await db.insert(products).values(req.body).returning();
        res.status(201).json(newProduct);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    app.put("/api/products/:id", authenticateToken, async (req, res) => {
      try {
        const [updated] = await db
          .update(products)
          .set({ ...req.body, updatedAt: new Date() })
          .where(eq(products.id, parseInt(req.params.id)))
          .returning();
        res.json(updated);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    app.delete("/api/products/:id", authenticateToken, async (req, res) => {
      try {
        const [updated] = await db
          .update(products)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(products.id, parseInt(req.params.id)))
          .returning();
        res.json({ success: true, product: updated });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // ========== INVENTORY ==========
    app.get("/api/inventory", authenticateToken, async (req: any, res) => {
      try {
        const branchId = req.query.branchId || req.user.branchId;
        
        const inventoryItems = await db.query.inventory.findMany({
          where: eq(inventory.branchId, parseInt(branchId)),
          with: {
            product: {
              with: {
                category: true,
                manufacturer: true
              }
            },
            branch: true,
            supplier: true
          },
          orderBy: [desc(inventory.createdAt)]
        });

        res.json(inventoryItems);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/inventory", authenticateToken, async (req, res) => {
      try {
        const [newInventory] = await db.insert(inventory).values(req.body).returning();
        res.status(201).json(newInventory);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    app.put("/api/inventory/:id", authenticateToken, async (req, res) => {
      try {
        const [updated] = await db
          .update(inventory)
          .set({ ...req.body, updatedAt: new Date() })
          .where(eq(inventory.id, parseInt(req.params.id)))
          .returning();
        res.json(updated);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    app.delete("/api/inventory/:id", authenticateToken, async (req, res) => {
      try {
        await db.delete(inventory).where(eq(inventory.id, parseInt(req.params.id)));
        res.json({ success: true });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // ========== CUSTOMERS ==========
    app.get("/api/customers", authenticateToken, async (req, res) => {
      try {
        const { search } = req.query;
        let allCustomers = await db.query.customers.findMany({
          where: eq(customers.isActive, true),
          orderBy: [desc(customers.createdAt)]
        });

        if (search) {
          const searchTerm = search.toString().toLowerCase();
          allCustomers = allCustomers.filter(c =>
            c.customerName.toLowerCase().includes(searchTerm) ||
            c.phone.includes(searchTerm) ||
            c.customerCode.toLowerCase().includes(searchTerm)
          );
        }

        res.json(allCustomers);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/api/customers/:id", authenticateToken, async (req, res) => {
      try {
        const customer = await db.query.customers.findFirst({
          where: eq(customers.id, parseInt(req.params.id)),
          with: {
            sales: { orderBy: [desc(sales.createdAt)], limit: 10 },
            onlineOrders: { orderBy: [desc(onlineOrders.createdAt)], limit: 10 },
            loyaltyTransactions: { orderBy: [desc(loyaltyTransactions.createdAt)], limit: 20 }
          }
        });

        if (!customer) {
          return res.status(404).json({ error: "Customer not found" });
        }

        res.json(customer);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/customers", authenticateToken, async (req: any, res) => {
      try {
        // Generate customer code
        const lastCustomer = await db.query.customers.findFirst({
          orderBy: [desc(customers.id)]
        });
        
        const nextId = (lastCustomer?.id || 0) + 1;
        const customerCode = `CUST${nextId.toString().padStart(6, '0')}`;

        const [newCustomer] = await db.insert(customers).values({
          ...req.body,
          customerCode,
          registrationBranch: req.user.branchId
        }).returning();

        res.status(201).json(newCustomer);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    app.put("/api/customers/:id", authenticateToken, async (req, res) => {
      try {
        const [updated] = await db
          .update(customers)
          .set({ ...req.body, updatedAt: new Date() })
          .where(eq(customers.id, parseInt(req.params.id)))
          .returning();
        res.json(updated);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    app.delete("/api/customers/:id", authenticateToken, async (req, res) => {
      try {
        const [updated] = await db
          .update(customers)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(customers.id, parseInt(req.params.id)))
          .returning();
        res.json({ success: true, customer: updated });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // ========== SALES ==========
    app.get("/api/sales", authenticateToken, async (req: any, res) => {
      try {
        const branchId = req.query.branchId || req.user.branchId;
        const { startDate, endDate } = req.query;

        let whereConditions: any = eq(sales.branchId, parseInt(branchId));

        if (startDate && endDate) {
          whereConditions = and(
            whereConditions,
            between(sales.saleDate, new Date(startDate as string), new Date(endDate as string))
          );
        }

        const allSales = await db.query.sales.findMany({
          where: whereConditions,
          with: {
            customer: true,
            saleItems: {
              with: {
                product: true
              }
            }
          },
          orderBy: [desc(sales.saleDate)],
          limit: 100
        });

        res.json(allSales);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/api/sales/:id", authenticateToken, async (req, res) => {
      try {
        const sale = await db.query.sales.findFirst({
          where: eq(sales.id, parseInt(req.params.id)),
          with: {
            customer: true,
            branch: true,
            saleItems: {
              with: {
                product: {
                  with: {
                    manufacturer: true
                  }
                }
              }
            }
          }
        });

        if (!sale) {
          return res.status(404).json({ error: "Sale not found" });
        }

        res.json(sale);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/sales", authenticateToken, async (req: any, res) => {
      try {
        const { items, customerId, paymentMethod, ...saleData } = req.body;

        // Generate invoice number
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const lastSale = await db.query.sales.findFirst({
          orderBy: [desc(sales.id)]
        });
        const nextId = (lastSale?.id || 0) + 1;
        const invoiceNumber = `INV-${dateStr}-${nextId.toString().padStart(5, '0')}`;

        // Create sale
        const [newSale] = await db.insert(sales).values({
          ...saleData,
          invoiceNumber,
          customerId: customerId || null,
          paymentMethod,
          branchId: req.user.branchId,
          createdBy: req.user.id,
          status: "COMPLETED"
        }).returning();

        // Create sale items and update inventory
        for (const item of items) {
          await db.insert(saleItems).values({
            saleId: newSale.id,
            ...item
          });

          // Reduce inventory
          await db
            .update(inventory)
            .set({
              quantityInStock: sql`${inventory.quantityInStock} - ${item.quantity}`,
              updatedAt: new Date()
            })
            .where(eq(inventory.id, item.inventoryId));
        }

        // Update customer loyalty points if applicable
        if (customerId && newSale.loyaltyPointsEarned && newSale.loyaltyPointsEarned > 0) {
          await db
            .update(customers)
            .set({
              loyaltyPoints: sql`${customers.loyaltyPoints} + ${newSale.loyaltyPointsEarned}`,
              totalPurchases: sql`${customers.totalPurchases} + ${newSale.totalAmount}`
            })
            .where(eq(customers.id, customerId));

          // Record loyalty transaction
          await db.insert(loyaltyTransactions).values({
            customerId,
            transactionType: "EARN",
            points: newSale.loyaltyPointsEarned,
            saleId: newSale.id,
            description: `Points earned from sale ${invoiceNumber}`,
            createdBy: req.user.id
          });
        }

        res.status(201).json({ saleId: newSale.id, invoiceNumber });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // ========== ONLINE ORDERS ==========
    app.get("/api/online-orders", authenticateToken, async (req: any, res) => {
      try {
        const branchId = req.query.branchId || req.user.branchId;
        const { status } = req.query;

        let whereConditions: any = eq(onlineOrders.branchId, parseInt(branchId));

        if (status) {
          whereConditions = and(whereConditions, eq(onlineOrders.status, status as string));
        }

        const orders = await db.query.onlineOrders.findMany({
          where: whereConditions,
          with: {
            customer: true,
            orderItems: {
              with: {
                product: true
              }
            }
          },
          orderBy: [desc(onlineOrders.createdAt)],
          limit: 100
        });

        res.json(orders);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/api/online-orders/:id", authenticateToken, async (req, res) => {
      try {
        const order = await db.query.onlineOrders.findFirst({
          where: eq(onlineOrders.id, parseInt(req.params.id)),
          with: {
            customer: true,
            branch: true,
            orderItems: {
              with: {
                product: {
                  with: {
                    manufacturer: true
                  }
                }
              }
            }
          }
        });

        if (!order) {
          return res.status(404).json({ error: "Order not found" });
        }

        res.json(order);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/online-orders/:id/confirm", authenticateToken, async (req: any, res) => {
      try {
        const [updated] = await db
          .update(onlineOrders)
          .set({
            status: "CONFIRMED",
            confirmedBy: req.user.id,
            confirmedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(onlineOrders.id, parseInt(req.params.id)))
          .returning();

        res.json(updated);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    app.post("/api/online-orders/:id/dispatch", authenticateToken, async (req: any, res) => {
      try {
        const [updated] = await db
          .update(onlineOrders)
          .set({
            status: "DISPATCHED",
            dispatchedBy: req.user.id,
            dispatchedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(onlineOrders.id, parseInt(req.params.id)))
          .returning();

        res.json(updated);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // ========== CATEGORIES ==========
    app.get("/api/categories", authenticateToken, async (req, res) => {
      try {
        const allCategories = await db.query.categories.findMany({
          where: eq(categories.isActive, true),
          orderBy: [categories.categoryName]
        });
        res.json(allCategories);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/categories", authenticateToken, async (req, res) => {
      try {
        const [newCategory] = await db.insert(categories).values(req.body).returning();
        res.status(201).json(newCategory);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // ========== MANUFACTURERS ==========
    app.get("/api/manufacturers", authenticateToken, async (req, res) => {
      try {
        const allManufacturers = await db.query.manufacturers.findMany({
          where: eq(manufacturers.isActive, true),
          orderBy: [manufacturers.manufacturerName]
        });
        res.json(allManufacturers);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/manufacturers", authenticateToken, async (req, res) => {
      try {
        const [newManufacturer] = await db.insert(manufacturers).values(req.body).returning();
        res.status(201).json(newManufacturer);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // ========== SUPPLIERS ==========
    app.get("/api/suppliers", authenticateToken, async (req, res) => {
      try {
        const allSuppliers = await db.query.suppliers.findMany({
          where: eq(suppliers.isActive, true),
          orderBy: [suppliers.supplierName]
        });
        res.json(allSuppliers);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/suppliers", authenticateToken, async (req, res) => {
      try {
        const lastSupplier = await db.query.suppliers.findFirst({
          orderBy: [desc(suppliers.id)]
        });
        const nextId = (lastSupplier?.id || 0) + 1;
        const supplierCode = `SUPP${nextId.toString().padStart(5, '0')}`;

        const [newSupplier] = await db.insert(suppliers).values({
          ...req.body,
          supplierCode
        }).returning();

        res.status(201).json(newSupplier);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    app.put("/api/suppliers/:id", authenticateToken, async (req, res) => {
      try {
        const [updated] = await db
          .update(suppliers)
          .set({ ...req.body, updatedAt: new Date() })
          .where(eq(suppliers.id, parseInt(req.params.id)))
          .returning();
        res.json(updated);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    app.delete("/api/suppliers/:id", authenticateToken, async (req, res) => {
      try {
        const [updated] = await db
          .update(suppliers)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(suppliers.id, parseInt(req.params.id)))
          .returning();
        res.json({ success: true, supplier: updated });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // ========== PURCHASE ORDERS ==========
    app.get("/api/purchase-orders", authenticateToken, async (req: any, res) => {
      try {
        const branchId = req.query.branchId || req.user.branchId;
        const { status } = req.query;

        let whereConditions: any = eq(purchaseOrders.branchId, parseInt(branchId));

        if (status) {
          whereConditions = and(whereConditions, eq(purchaseOrders.status, status as string));
        }

        const orders = await db.query.purchaseOrders.findMany({
          where: whereConditions,
          with: {
            supplier: true,
            items: {
              with: {
                product: true
              }
            }
          },
          orderBy: [desc(purchaseOrders.createdAt)],
          limit: 100
        });

        res.json(orders);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/api/purchase-orders/:id", authenticateToken, async (req, res) => {
      try {
        const order = await db.query.purchaseOrders.findFirst({
          where: eq(purchaseOrders.id, parseInt(req.params.id)),
          with: {
            supplier: true,
            branch: true,
            items: {
              with: {
                product: true
              }
            }
          }
        });

        if (!order) {
          return res.status(404).json({ error: "Purchase order not found" });
        }

        res.json(order);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/purchase-orders", authenticateToken, async (req: any, res) => {
      try {
        const { items, ...poData } = req.body;

        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const lastPO = await db.query.purchaseOrders.findFirst({
          orderBy: [desc(purchaseOrders.id)]
        });
        const nextId = (lastPO?.id || 0) + 1;
        const poNumber = `PO-${dateStr}-${nextId.toString().padStart(5, '0')}`;

        const [newPO] = await db.insert(purchaseOrders).values({
          ...poData,
          poNumber,
          branchId: req.user.branchId,
          createdBy: req.user.id,
          status: poData.status || "DRAFT",
          expectedDeliveryDate: poData.expectedDeliveryDate ? new Date(poData.expectedDeliveryDate) : null
        }).returning();

        if (items && items.length > 0) {
          for (const item of items) {
            await db.insert(purchaseOrderItems).values({
              purchaseOrderId: newPO.id,
              ...item
            });
          }
        }

        res.status(201).json({ purchaseOrderId: newPO.id, poNumber });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    app.put("/api/purchase-orders/:id/status", authenticateToken, async (req: any, res) => {
      try {
        const { status } = req.body;
        const [updated] = await db
          .update(purchaseOrders)
          .set({ status, updatedAt: new Date() })
          .where(eq(purchaseOrders.id, parseInt(req.params.id)))
          .returning();
        res.json(updated);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    app.post("/api/purchase-orders/:id/receive", authenticateToken, async (req: any, res) => {
      try {
        const poId = parseInt(req.params.id);
        const { receivedItems } = req.body;

        const [updatedPO] = await db
          .update(purchaseOrders)
          .set({ status: "RECEIVED", updatedAt: new Date() })
          .where(eq(purchaseOrders.id, poId))
          .returning();

        if (receivedItems && receivedItems.length > 0) {
          for (const item of receivedItems) {
            await db
              .update(purchaseOrderItems)
              .set({ receivedQuantity: item.receivedQuantity })
              .where(eq(purchaseOrderItems.id, item.id));

            if (item.addToInventory) {
              await db.insert(inventory).values({
                productId: item.productId,
                branchId: req.user.branchId,
                batchNumber: item.batchNumber,
                expiryDate: new Date(item.expiryDate),
                purchasePrice: item.unitPrice,
                sellingPrice: item.sellingPrice || item.unitPrice,
                mrp: item.mrp || item.unitPrice,
                gstPercentage: item.gstPercentage || "0",
                quantityInStock: item.receivedQuantity,
                reorderLevel: item.reorderLevel || 10,
                supplierId: updatedPO.supplierId,
                location: item.location || null
              });
            }
          }
        }

        res.json(updatedPO);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    app.delete("/api/purchase-orders/:id", authenticateToken, async (req, res) => {
      try {
        const poId = parseInt(req.params.id);
        await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, poId));
        await db.delete(purchaseOrders).where(eq(purchaseOrders.id, poId));
        res.json({ success: true });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // ========== ROLES ==========
    app.get("/api/roles", authenticateToken, async (req, res) => {
      try {
        const allRoles = await db.query.roles.findMany({
          orderBy: [roles.roleName]
        });
        res.json(allRoles);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ========== USERS MANAGEMENT ==========
    app.get("/api/users", authenticateToken, async (req, res) => {
      try {
        const allUsers = await db.query.users.findMany({
          with: { role: true, branch: true },
          orderBy: [users.fullName]
        });
        res.json(allUsers.map(u => ({
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          email: u.email,
          phone: u.phone,
          role: u.role,
          branch: u.branch,
          isActive: u.isActive,
          lastLogin: u.lastLogin,
          createdAt: u.createdAt
        })));
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ========== LOYALTY TIERS ==========
    app.get("/api/loyalty-tiers", authenticateToken, async (req, res) => {
      try {
        const tiers = await db.query.loyaltyTiers.findMany({
          orderBy: [loyaltyTiers.minPoints]
        });
        res.json(tiers);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ========== AUDIT LOGS ==========
    app.get("/api/audit-logs", authenticateToken, async (req: any, res) => {
      try {
        const logs = await db.query.auditLogs.findMany({
          orderBy: [desc(auditLogs.createdAt)],
          limit: 100
        });
        res.json(logs);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ========== ALERTS ==========
    app.get("/api/alerts/expiry", authenticateToken, async (req: any, res) => {
      try {
        const branchId = req.query.branchId || req.user.branchId;

        const alerts = await db.query.expiryAlerts.findMany({
          where: and(
            eq(expiryAlerts.branchId, parseInt(branchId)),
            eq(expiryAlerts.isResolved, false)
          ),
          with: {
            product: true
          },
          orderBy: [expiryAlerts.expiryDate]
        });

        res.json(alerts);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/api/alerts/stock", authenticateToken, async (req: any, res) => {
      try {
        const branchId = req.query.branchId || req.user.branchId;

        const alerts = await db.query.stockAlerts.findMany({
          where: and(
            eq(stockAlerts.branchId, parseInt(branchId)),
            eq(stockAlerts.isResolved, false)
          ),
          with: {
            product: true
          },
          orderBy: [desc(stockAlerts.createdAt)]
        });

        res.json(alerts);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ========== WHATSAPP (Meta Cloud API) ==========
    app.get("/api/whatsapp/status", authenticateToken, async (req, res) => {
      try {
        const profile = await whatsappService.getBusinessProfile();
        res.json(profile);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/api/whatsapp/templates", authenticateToken, async (req, res) => {
      try {
        const templates = await db.query.whatsappTemplates.findMany({
          where: eq(whatsappTemplates.isActive, true),
          orderBy: [whatsappTemplates.templateName],
        });
        res.json(templates);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/whatsapp/templates", authenticateToken, async (req, res) => {
      try {
        const [newTemplate] = await db
          .insert(whatsappTemplates)
          .values(req.body)
          .returning();
        res.status(201).json(newTemplate);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    app.get("/api/whatsapp/messages", authenticateToken, async (req, res) => {
      try {
        const messages = await db.query.whatsappMessages.findMany({
          orderBy: [desc(whatsappMessages.createdAt)],
          limit: 100,
        });
        res.json(messages);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/whatsapp/send", authenticateToken, async (req, res) => {
      try {
        const { phoneNumber, message, customerId } = req.body;
        if (!phoneNumber || !message) {
          return res.status(400).json({ error: "phoneNumber and message are required" });
        }
        const result = await whatsappService.sendTextMessage(
          phoneNumber,
          message,
          customerId
        );
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/whatsapp/send-template", authenticateToken, async (req, res) => {
      try {
        const { phoneNumber, templateName, languageCode, components, customerId } = req.body;
        if (!phoneNumber || !templateName) {
          return res.status(400).json({ error: "phoneNumber and templateName are required" });
        }
        const result = await whatsappService.sendTemplateMessage(
          phoneNumber,
          templateName,
          languageCode || "en",
          components || [],
          customerId
        );
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/whatsapp/send-invoice", authenticateToken, async (req, res) => {
      try {
        const { phoneNumber, invoiceNumber, totalAmount, pdfUrl, customerId } = req.body;
        if (!phoneNumber || !invoiceNumber || !pdfUrl) {
          return res.status(400).json({ error: "phoneNumber, invoiceNumber, and pdfUrl are required" });
        }
        const result = await whatsappService.sendInvoice(
          phoneNumber,
          invoiceNumber,
          totalAmount,
          pdfUrl,
          customerId
        );
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/whatsapp/send-order-update", authenticateToken, async (req, res) => {
      try {
        const { phoneNumber, orderNumber, status, customerId } = req.body;
        if (!phoneNumber || !orderNumber || !status) {
          return res.status(400).json({ error: "phoneNumber, orderNumber, and status are required" });
        }
        const result = await whatsappService.sendOrderUpdate(
          phoneNumber,
          orderNumber,
          status,
          customerId
        );
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/whatsapp/send-loyalty", authenticateToken, async (req, res) => {
      try {
        const { phoneNumber, customerName, pointsEarned, totalPoints, tier, customerId } = req.body;
        if (!phoneNumber || !customerName) {
          return res.status(400).json({ error: "phoneNumber and customerName are required" });
        }
        const result = await whatsappService.sendLoyaltyNotification(
          phoneNumber,
          customerName,
          pointsEarned || 0,
          totalPoints || 0,
          tier || "BRONZE",
          customerId
        );
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/whatsapp/send-reminder", authenticateToken, async (req, res) => {
      try {
        const { phoneNumber, customerName, medicineName, refillDate, customerId } = req.body;
        if (!phoneNumber || !customerName || !medicineName) {
          return res.status(400).json({ error: "phoneNumber, customerName, and medicineName are required" });
        }
        const result = await whatsappService.sendExpiryReminder(
          phoneNumber,
          customerName,
          medicineName,
          refillDate || "soon",
          customerId
        );
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/whatsapp/campaign", authenticateToken, async (req, res) => {
      try {
        const { phoneNumbers, message } = req.body;
        if (!phoneNumbers?.length || !message) {
          return res.status(400).json({ error: "phoneNumbers array and message are required" });
        }
        const results = await whatsappService.sendCampaignMessage(phoneNumbers, message);
        res.json({
          total: results.length,
          sent: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
          details: results,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/whatsapp/webhook", async (req, res) => {
      try {
        await whatsappService.handleWebhook(req.body);
        res.sendStatus(200);
      } catch (error: any) {
        res.sendStatus(200);
      }
    });

    app.get("/api/whatsapp/webhook", (req, res) => {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "suvidha-pharmacy-verify";

      if (mode === "subscribe" && token === verifyToken) {
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    });

    // ========== AI MICROSERVICE ENDPOINTS ==========
    app.get("/api/ai/health", authenticateToken, async (req, res) => {
      try {
        const result = await aiClient.checkAIHealth();
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/ai/predict/demand", authenticateToken, async (req: any, res) => {
      try {
        const { productId, forecastDays } = req.body;
        if (!productId) {
          return res.status(400).json({ error: "productId is required" });
        }
        const branchId = req.user.branchId;

        const salesData = await db.query.saleItems.findMany({
          with: { sale: true },
          where: eq(saleItems.productId, productId),
        });

        const salesHistory = salesData
          .filter((si: any) => si.sale && si.sale.branchId === branchId)
          .map((si: any) => ({
            date: si.sale.saleDate,
            quantity: si.quantity,
          }));

        if (salesHistory.length === 0) {
          return res.json({
            product_id: productId,
            method: "no_data",
            forecast: [],
            summary: {
              avg_daily_demand: 0,
              total_forecast: 0,
              recommended_reorder_qty: 0,
              message: "No sales history available for this product in your branch",
            },
          });
        }

        const result = await aiClient.predictDemand(salesHistory, productId, forecastDays);
        if (!result.success) {
          return res.status(502).json({ error: result.error });
        }
        res.json(result.data);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/ai/predict/expiry-risk", authenticateToken, async (req: any, res) => {
      try {
        const branchId = req.query.branchId || req.user.branchId;

        const inventoryData = await db.query.inventory.findMany({
          where: eq(inventory.branchId, parseInt(branchId)),
          with: { product: true },
        });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentSales = await db
          .select({
            productId: saleItems.productId,
            totalQty: sql<number>`SUM(${saleItems.quantity})`,
          })
          .from(saleItems)
          .innerJoin(sales, eq(saleItems.saleId, sales.id))
          .where(and(
            eq(sales.branchId, parseInt(branchId)),
            gte(sales.saleDate, thirtyDaysAgo)
          ))
          .groupBy(saleItems.productId);

        const avgDailySalesMap: Record<number, number> = {};
        for (const row of recentSales) {
          avgDailySalesMap[row.productId] = parseFloat(String(row.totalQty)) / 30;
        }

        const batches = inventoryData.map((inv: any) => ({
          batch_number: inv.batchNumber,
          product_id: inv.productId,
          product_name: inv.product?.productName || "",
          expiry_date: inv.expiryDate,
          quantity_in_stock: inv.quantityInStock,
          avg_daily_sales: avgDailySalesMap[inv.productId] || 0,
        }));

        const result = await aiClient.predictExpiryRisk(batches);
        if (!result.success) {
          return res.status(502).json({ error: result.error });
        }
        res.json(result.data);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/ai/analyze/sales-trends", authenticateToken, async (req: any, res) => {
      try {
        const branchId = req.user.branchId;
        const { period } = req.body;

        const allSales = await db.query.sales.findMany({
          where: eq(sales.branchId, branchId),
          with: { saleItems: { with: { product: true } } },
          orderBy: [sales.saleDate],
        });

        const salesData = allSales.map((s: any) => ({
          date: s.saleDate,
          amount: parseFloat(s.totalAmount),
          quantity: s.saleItems?.reduce((sum: number, si: any) => sum + si.quantity, 0) || 0,
        }));

        if (salesData.length === 0) {
          return res.json({
            period_type: period || "monthly",
            periods: [],
            trend: { direction: "stable", slope: 0, growth_rate_pct: 0 },
            summary: { total_revenue: 0, total_transactions: 0 },
          });
        }

        const result = await aiClient.analyzeSalesTrends(salesData, period);
        if (!result.success) {
          return res.status(502).json({ error: result.error });
        }
        res.json(result.data);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/ai/segment/customers", authenticateToken, async (req, res) => {
      try {
        const allCustomers = await db.query.customers.findMany({
          where: eq(customers.isActive, true),
        });

        const lastSaleDates = await db
          .select({
            customerId: sales.customerId,
            lastDate: sql<Date>`MAX(${sales.saleDate})`,
            saleCount: sql<number>`COUNT(*)`,
          })
          .from(sales)
          .where(sql`${sales.customerId} IS NOT NULL`)
          .groupBy(sales.customerId);

        const saleLookup: Record<number, { lastDate: Date; count: number }> = {};
        for (const row of lastSaleDates) {
          if (row.customerId) {
            saleLookup[row.customerId] = {
              lastDate: row.lastDate,
              count: parseInt(String(row.saleCount)),
            };
          }
        }

        const customerData = allCustomers.map((c: any) => ({
          customer_id: c.id,
          customer_name: c.customerName,
          total_purchases: parseFloat(c.totalPurchases || "0"),
          purchase_count: saleLookup[c.id]?.count || (c.loyaltyPoints > 0 ? 1 : 0),
          last_purchase_date: saleLookup[c.id]?.lastDate || null,
        }));

        const result = await aiClient.segmentCustomers(customerData);
        if (!result.success) {
          return res.status(502).json({ error: result.error });
        }
        res.json(result.data);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    console.log("✅ All API routes registered (WhatsApp Cloud API + AI Microservice)");
  }
  