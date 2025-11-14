import bcrypt from "bcrypt";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  try {
    console.log("开始创建管理员用户...");

    // 检查是否已经存在 admin 用户
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin"));

    if (existingAdmin.length > 0) {
      console.log("管理员用户已存在，跳过创建。");
      return;
    }

    // 创建管理员用户
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const [admin] = await db
      .insert(users)
      .values({
        username: "admin",
        password: hashedPassword,
        role: "admin",
        xpBalance: "999999999",
        wanBalance: "999999999",
      })
      .returning();

    console.log("✓ 管理员用户创建成功！");
    console.log("  用户名: admin");
    console.log("  密码: admin123");
    console.log("  角色: admin");
    console.log(`  用户 ID: ${admin.id}`);

    process.exit(0);
  } catch (error) {
    console.error("创建管理员用户失败:", error);
    process.exit(1);
  }
}

seedAdmin();
