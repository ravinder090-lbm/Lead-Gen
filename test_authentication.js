// This is a simple script to test our authentication flow
// Run with: node test_authentication.js

async function testAuth() {
  console.log("🔍 Starting authentication testing...");
  
  // Step 1: Create admin user
  console.log("\n1️⃣ Creating admin user...");
  try {
    const createAdminResponse = await fetch("http://localhost:5000/api/dev/create-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    
    if (!createAdminResponse.ok) {
      throw new Error(`Failed to create admin: ${createAdminResponse.status} ${createAdminResponse.statusText}`);
    }
    
    const createAdminData = await createAdminResponse.json();
    console.log("✅ Admin created or already exists:", createAdminData);
  } catch (error) {
    console.error("❌ Admin creation failed:", error);
  }
  
  // Step 2: Test admin login
  console.log("\n2️⃣ Testing admin login...");
  let cookies = "";
  try {
    const loginResponse = await fetch("http://localhost:5000/api/dev/login-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Failed to login admin: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    // Capture the cookies
    cookies = loginResponse.headers.get("set-cookie");
    console.log("🍪 Cookies:", cookies);
    
    const loginData = await loginResponse.json();
    console.log("✅ Admin login successful:", loginData);
  } catch (error) {
    console.error("❌ Admin login failed:", error);
  }
  
  // Step 3: Test session state
  console.log("\n3️⃣ Testing session state...");
  try {
    const sessionResponse = await fetch("http://localhost:5000/api/test-session", {
      headers: cookies ? { "Cookie": cookies } : {}
    });
    
    if (!sessionResponse.ok) {
      throw new Error(`Failed to get session state: ${sessionResponse.status} ${sessionResponse.statusText}`);
    }
    
    const sessionData = await sessionResponse.json();
    console.log("🔍 Session state:", sessionData);
    
    if (sessionData.userInSession) {
      console.log("✅ User in session verified!", sessionData.userDetails);
    } else {
      console.log("❌ No user in session!");
    }
  } catch (error) {
    console.error("❌ Session check failed:", error);
  }
  
  // Step 4: Test admin dashboard access
  console.log("\n4️⃣ Testing admin dashboard access...");
  try {
    const dashboardResponse = await fetch("http://localhost:5000/api/admin/dashboard", {
      headers: cookies ? { "Cookie": cookies } : {}
    });
    
    if (!dashboardResponse.ok) {
      throw new Error(`Failed to access dashboard: ${dashboardResponse.status} ${dashboardResponse.statusText}`);
    }
    
    const dashboardData = await dashboardResponse.json();
    console.log("✅ Dashboard access successful!");
    console.log("📊 Dashboard data:", JSON.stringify(dashboardData, null, 2).substring(0, 200) + "...");
  } catch (error) {
    console.error("❌ Dashboard access failed:", error);
  }
  
  console.log("\n🏁 Authentication testing complete!");
}

testAuth().catch(console.error);