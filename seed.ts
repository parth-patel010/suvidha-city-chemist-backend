import { db } from "./server/db";
  import {
    roles, users, branches, categories, manufacturers, suppliers,
    products, inventory, customers, loyaltyTiers, whatsappTemplates
  } from "./shared/schema";
  import bcrypt from "bcrypt";
  import { eq } from "drizzle-orm";

  async function seed() {
    console.log("🌱 Seeding database...");

    try {
      // Skip if already seeded (admin exists)
      const existing = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
      if (existing.length > 0) {
        console.log("✅ Database already seeded. Default credentials:");
        console.log("   Admin:    admin / admin123");
        console.log("   Manager:  manager1 / password123");
        console.log("   Cashier:  cashier1 / password123");
        process.exit(0);
        return;
      }

      // 1. Create Roles
      console.log("Creating roles...");
      const [adminRole] = await db.insert(roles).values({
        roleName: "Admin",
        permissions: JSON.stringify([
          "manage_users", "manage_branches", "manage_products",
          "manage_inventory", "manage_sales", "manage_purchases",
          "view_reports", "manage_customers", "manage_online_orders"
        ]),
        description: "Full system access"
      }).returning();

      const [managerRole] = await db.insert(roles).values({
        roleName: "Manager",
        permissions: JSON.stringify([
          "manage_products", "manage_inventory", "manage_sales",
          "manage_purchases", "view_reports", "manage_customers"
        ]),
        description: "Branch manager with most permissions"
      }).returning();

      const [cashierRole] = await db.insert(roles).values({
        roleName: "Cashier",
        permissions: JSON.stringify([
          "create_sales", "view_products", "view_customers", "manage_customers"
        ]),
        description: "Point of sale operations only"
      }).returning();

      // 2. Create Branches
      console.log("Creating branches...");
      const [mainBranch] = await db.insert(branches).values({
        branchCode: "BR001",
        branchName: "Suvidha City Chemist - Main",
        address: "123 MG Road",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        phone: "+91-22-12345678",
        email: "main@suvidhachemist.com",
        gstNumber: "27AAAAA0000A1Z5",
        drugLicense: "DL-MH-2024-001",
        drugLicenseExpiry: new Date("2025-12-31"),
        managerName: "Rajesh Kumar",
        openingTime: "08:00",
        closingTime: "22:00",
        isActive: true
      }).returning();

      const [branch2] = await db.insert(branches).values({
        branchCode: "BR002",
        branchName: "Suvidha City Chemist - Andheri",
        address: "456 SV Road, Andheri West",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400058",
        phone: "+91-22-87654321",
        email: "andheri@suvidhachemist.com",
        gstNumber: "27AAAAA0000A1Z6",
        drugLicense: "DL-MH-2024-002",
        drugLicenseExpiry: new Date("2025-12-31"),
        managerName: "Priya Sharma",
        openingTime: "09:00",
        closingTime: "21:00",
        isActive: true
      }).returning();

      // 3. Create Users
      console.log("Creating users...");
      const hashedPassword = await bcrypt.hash("password123", 10);
      const hashedAdminPassword = await bcrypt.hash("admin123", 10);

      const [adminUser] = await db.insert(users).values({
        username: "admin",
        email: "admin@suvidhachemist.com",
        passwordHash: hashedAdminPassword,
        fullName: "System Administrator",
        phone: "+91-9876543210",
        roleId: adminRole.id,
        branchId: mainBranch.id,
        isActive: true
      }).returning();

      await db.insert(users).values({
        username: "manager1",
        email: "manager@suvidhachemist.com",
        passwordHash: hashedPassword,
        fullName: "Rajesh Kumar",
        phone: "+91-9876543211",
        roleId: managerRole.id,
        branchId: mainBranch.id,
        isActive: true
      });

      await db.insert(users).values({
        username: "cashier1",
        email: "cashier@suvidhachemist.com",
        passwordHash: hashedPassword,
        fullName: "Amit Patel",
        phone: "+91-9876543212",
        roleId: cashierRole.id,
        branchId: mainBranch.id,
        isActive: true
      });

      // 4. Create Categories
      console.log("Creating categories...");
      const [painReliefCat] = await db.insert(categories).values({
        categoryName: "Pain Relief & Fever",
        description: "Analgesics and antipyretics",
        isActive: true
      }).returning();

      const [antibioticsCat] = await db.insert(categories).values({
        categoryName: "Antibiotics",
        description: "Antibacterial medications",
        isActive: true
      }).returning();

      const [vitaminsCat] = await db.insert(categories).values({
        categoryName: "Vitamins & Supplements",
        description: "Nutritional supplements",
        isActive: true
      }).returning();

      const [diabetesCat] = await db.insert(categories).values({
        categoryName: "Diabetes Care",
        description: "Medications for diabetes management",
        isActive: true
      }).returning();

      const [respiratoryCat] = await db.insert(categories).values({
        categoryName: "Respiratory Care",
        description: "Cough, cold and respiratory medications",
        isActive: true
      }).returning();

      // 5. Create Manufacturers
      console.log("Creating manufacturers...");
      const [cipla] = await db.insert(manufacturers).values({
        manufacturerName: "Cipla Ltd",
        contactPerson: "Sales Manager",
        phone: "+91-22-24826000",
        email: "sales@cipla.com",
        address: "Cipla House, Peninsula Business Park, Mumbai",
        gstNumber: "27AAAAA1111A1Z1",
        isActive: true
      }).returning();

      const [sunPharma] = await db.insert(manufacturers).values({
        manufacturerName: "Sun Pharmaceutical Industries",
        contactPerson: "Distribution Head",
        phone: "+91-79-26851500",
        email: "info@sunpharma.com",
        address: "Sun House, Ahmedabad",
        gstNumber: "24AAAAA2222A1Z2",
        isActive: true
      }).returning();

      const [drReddys] = await db.insert(manufacturers).values({
        manufacturerName: "Dr. Reddy's Laboratories",
        contactPerson: "Regional Manager",
        phone: "+91-40-44346000",
        email: "contact@drreddys.com",
        address: "Hyderabad, Telangana",
        gstNumber: "36AAAAA3333A1Z3",
        isActive: true
      }).returning();

      // 6. Create Suppliers
      console.log("Creating suppliers...");
      const [supplier1] = await db.insert(suppliers).values({
        supplierCode: "SUPP00001",
        supplierName: "MedPlus Distributors",
        contactPerson: "Vikram Singh",
        phone: "+91-22-12341234",
        email: "orders@medplus.com",
        address: "Industrial Estate, Mumbai",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400042",
        gstNumber: "27BBBBB1111B1Z1",
        drugLicense: "DL-DIST-001",
        paymentTerms: "Net 30 days",
        creditLimit: "500000.00",
        outstandingBalance: "0",
        isActive: true
      }).returning();

      // 7. Create Products
      console.log("Creating products...");
      const [paracetamol] = await db.insert(products).values({
        productCode: "MED001",
        productName: "Crocin 650mg",
        genericName: "Paracetamol",
        categoryId: painReliefCat.id,
        manufacturerId: cipla.id,
        composition: "Paracetamol 650mg",
        description: "For fever and pain relief",
        dosageForm: "Tablet",
        strength: "650mg",
        packSize: "15 tablets",
        unit: "Strip",
        hsnCode: "30049099",
        requiresPrescription: false,
        isScheduleH: false,
        isScheduleH1: false,
        storageConditions: "Store in a cool and dry place",
        sideEffects: "Rarely causes side effects when taken as directed",
        isActive: true
      }).returning();

      const [amoxicillin] = await db.insert(products).values({
        productCode: "MED002",
        productName: "Moxikind-CV 625",
        genericName: "Amoxicillin + Clavulanic Acid",
        categoryId: antibioticsCat.id,
        manufacturerId: sunPharma.id,
        composition: "Amoxicillin 500mg + Clavulanic Acid 125mg",
        description: "Broad spectrum antibiotic",
        dosageForm: "Tablet",
        strength: "625mg",
        packSize: "10 tablets",
        unit: "Strip",
        hsnCode: "30042090",
        requiresPrescription: true,
        isScheduleH: true,
        isScheduleH1: false,
        storageConditions: "Store below 25°C",
        sideEffects: "May cause nausea, diarrhea, or allergic reactions",
        isActive: true
      }).returning();

      const [vitaminD] = await db.insert(products).values({
        productCode: "MED003",
        productName: "Uprise-D3 60K",
        genericName: "Vitamin D3",
        categoryId: vitaminsCat.id,
        manufacturerId: drReddys.id,
        composition: "Cholecalciferol 60000 IU",
        description: "Vitamin D supplement for bone health",
        dosageForm: "Capsule",
        strength: "60000 IU",
        packSize: "4 capsules",
        unit: "Strip",
        hsnCode: "30049011",
        requiresPrescription: false,
        isScheduleH: false,
        isScheduleH1: false,
        storageConditions: "Store in a cool place away from light",
        sideEffects: "Rarely causes side effects",
        isActive: true
      }).returning();

      const [metformin] = await db.insert(products).values({
        productCode: "MED004",
        productName: "Glycomet GP1",
        genericName: "Metformin + Glimepiride",
        categoryId: diabetesCat.id,
        manufacturerId: cipla.id,
        composition: "Metformin 500mg + Glimepiride 1mg",
        description: "For Type 2 Diabetes",
        dosageForm: "Tablet",
        strength: "500mg+1mg",
        packSize: "15 tablets",
        unit: "Strip",
        hsnCode: "30043920",
        requiresPrescription: true,
        isScheduleH: true,
        isScheduleH1: false,
        storageConditions: "Store below 30°C",
        sideEffects: "May cause hypoglycemia, nausea",
        isActive: true
      }).returning();

      const [coughSyrup] = await db.insert(products).values({
        productCode: "MED005",
        productName: "Benadryl Cough Syrup",
        genericName: "Diphenhydramine",
        categoryId: respiratoryCat.id,
        manufacturerId: sunPharma.id,
        composition: "Diphenhydramine HCl 14.08mg/5ml",
        description: "Relief from cough and cold",
        dosageForm: "Syrup",
        strength: "100ml",
        packSize: "1 bottle",
        unit: "Bottle",
        hsnCode: "30049015",
        requiresPrescription: false,
        isScheduleH: false,
        isScheduleH1: false,
        storageConditions: "Store below 25°C",
        sideEffects: "May cause drowsiness",
        isActive: true
      }).returning();

      // 8. Create Inventory for Main Branch
      console.log("Creating inventory...");
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      await db.insert(inventory).values({
        productId: paracetamol.id,
        branchId: mainBranch.id,
        batchNumber: "CR2024001",
        expiryDate: futureDate,
        purchasePrice: "8.50",
        sellingPrice: "12.00",
        mrp: "15.00",
        gstPercentage: "12.00",
        quantityInStock: 500,
        reorderLevel: 100,
        location: "A-1-01",
        manufactureDate: new Date("2024-01-15"),
        supplierId: supplier1.id
      });

      await db.insert(inventory).values({
        productId: amoxicillin.id,
        branchId: mainBranch.id,
        batchNumber: "MX2024005",
        expiryDate: futureDate,
        purchasePrice: "45.00",
        sellingPrice: "65.00",
        mrp: "75.00",
        gstPercentage: "12.00",
        quantityInStock: 200,
        reorderLevel: 50,
        location: "B-2-05",
        manufactureDate: new Date("2024-02-10"),
        supplierId: supplier1.id
      });

      await db.insert(inventory).values({
        productId: vitaminD.id,
        branchId: mainBranch.id,
        batchNumber: "VD2024012",
        expiryDate: futureDate,
        purchasePrice: "85.00",
        sellingPrice: "120.00",
        mrp: "140.00",
        gstPercentage: "12.00",
        quantityInStock: 150,
        reorderLevel: 30,
        location: "C-1-03",
        manufactureDate: new Date("2024-01-20"),
        supplierId: supplier1.id
      });

      await db.insert(inventory).values({
        productId: metformin.id,
        branchId: mainBranch.id,
        batchNumber: "GL2024008",
        expiryDate: futureDate,
        purchasePrice: "32.00",
        sellingPrice: "48.00",
        mrp: "55.00",
        gstPercentage: "12.00",
        quantityInStock: 300,
        reorderLevel: 75,
        location: "D-3-02",
        manufactureDate: new Date("2024-03-01"),
        supplierId: supplier1.id
      });

      await db.insert(inventory).values({
        productId: coughSyrup.id,
        branchId: mainBranch.id,
        batchNumber: "BN2024015",
        expiryDate: futureDate,
        purchasePrice: "95.00",
        sellingPrice: "130.00",
        mrp: "145.00",
        gstPercentage: "18.00",
        quantityInStock: 180,
        reorderLevel: 40,
        location: "E-1-04",
        manufactureDate: new Date("2024-02-25"),
        supplierId: supplier1.id
      });

      // 9. Create Loyalty Tiers
      console.log("Creating loyalty tiers...");
      await db.insert(loyaltyTiers).values([
        {
          tierName: "BRONZE",
          minPoints: 0,
          maxPoints: 499,
          discountPercentage: "2.00",
          pointsMultiplier: "1.00",
          benefits: JSON.stringify(["1 point per ₹100 spent", "2% discount on purchases"])
        },
        {
          tierName: "SILVER",
          minPoints: 500,
          maxPoints: 1499,
          discountPercentage: "5.00",
          pointsMultiplier: "1.25",
          benefits: JSON.stringify(["1.25 points per ₹100 spent", "5% discount", "Birthday bonus"])
        },
        {
          tierName: "GOLD",
          minPoints: 1500,
          maxPoints: 2999,
          discountPercentage: "8.00",
          pointsMultiplier: "1.50",
          benefits: JSON.stringify(["1.5 points per ₹100 spent", "8% discount", "Priority service"])
        },
        {
          tierName: "PLATINUM",
          minPoints: 3000,
          maxPoints: null,
          discountPercentage: "12.00",
          pointsMultiplier: "2.00",
          benefits: JSON.stringify(["2 points per ₹100 spent", "12% discount", "Free home delivery", "Exclusive offers"])
        }
      ]);

      // 10. Create Sample Customers
      console.log("Creating customers...");
      await db.insert(customers).values([
        {
          customerCode: "CUST000001",
          customerName: "Ramesh Verma",
          phone: "+91-9876501234",
          email: "ramesh.verma@email.com",
          dateOfBirth: new Date("1985-06-15"),
          gender: "Male",
          address: "Flat 101, Green Park Society",
          city: "Mumbai",
          pincode: "400001",
          loyaltyPoints: 150,
          loyaltyTier: "BRONZE",
          totalPurchases: "2500.00",
          registrationBranch: mainBranch.id,
          whatsappOptIn: true,
          isActive: true
        },
        {
          customerCode: "CUST000002",
          customerName: "Priya Desai",
          phone: "+91-9876502345",
          email: "priya.desai@email.com",
          dateOfBirth: new Date("1990-03-22"),
          gender: "Female",
          address: "B-404, Sunshine Apartments",
          city: "Mumbai",
          pincode: "400058",
          loyaltyPoints: 820,
          loyaltyTier: "SILVER",
          totalPurchases: "8500.00",
          registrationBranch: mainBranch.id,
          whatsappOptIn: true,
          isActive: true
        }
      ]);

      // 11. Create WhatsApp Templates
      console.log("Creating WhatsApp templates...");
      await db.insert(whatsappTemplates).values([
        {
          templateName: "Welcome Message",
          templateType: "WELCOME",
          message: "Welcome to Suvidha City Chemist! Thank you for registering with us. You are now a {{tier}} member. Your loyalty points: {{points}}",
          variables: JSON.stringify(["tier", "points"]),
          isActive: true
        },
        {
          templateName: "Bill Receipt",
          templateType: "BILL",
          message: "Thank you for shopping at Suvidha City Chemist! Invoice: {{invoiceNumber}}, Total: ₹{{amount}}, Points Earned: {{points}}. Visit again!",
          variables: JSON.stringify(["invoiceNumber", "amount", "points"]),
          isActive: true
        },
        {
          templateName: "Expiry Reminder",
          templateType: "EXPIRY",
          message: "Hi {{customerName}}, your medicine {{productName}} (Batch: {{batch}}) is expiring on {{expiryDate}}. Please check and dispose safely.",
          variables: JSON.stringify(["customerName", "productName", "batch", "expiryDate"]),
          isActive: true
        },
        {
          templateName: "Promotional Offer",
          templateType: "PROMOTION",
          message: "🎉 Special Offer! Get {{discount}}% off on {{category}} products. Valid till {{validTill}}. Visit Suvidha City Chemist today!",
          variables: JSON.stringify(["discount", "category", "validTill"]),
          isActive: true
        }
      ]);

      console.log("✅ Database seeded successfully!");
      console.log("");
      console.log("📋 Login Credentials:");
      console.log("   Admin:    admin / admin123");
      console.log("   Manager:  manager1 / password123");
      console.log("   Cashier:  cashier1 / password123");

      process.exit(0);
    } catch (error) {
      console.error("❌ Error seeding database:", error);
      process.exit(1);
    }
  }

  seed();
  