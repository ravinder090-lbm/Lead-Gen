import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/contexts/auth-context";

export default function AuthDebug() {
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("password123");
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { login, user } = useAuth();

  useEffect(() => {
    // Display current auth status
    if (user) {
      setResult(`Currently logged in as: ${user.name} (${user.email}) - Role: ${user.role}`);
    } else {
      setResult("Not logged in");
    }
  }, [user]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, rememberMe: true }),
        credentials: 'include'
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      setResult(`Login successful: ${JSON.stringify(data, null, 2)}`);
      toast({
        title: "Login Successful",
        description: `Welcome back, ${data.name || 'User'}!`,
      });
      
      // Now check if we can access the leads API
      checkLeadsAPI();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login');
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: err.message || 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkLeadsAPI = async () => {
    try {
      const response = await fetch('/api/leads', {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setResult(`Error accessing leads API: ${JSON.stringify(data, null, 2)}`);
        return;
      }
      
      setResult(`Successfully accessed leads API. Found ${data.length} leads.`);
    } catch (err) {
      console.error('API access error:', err);
      setResult('Error checking leads API');
    }
  };

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setResult('Not authenticated');
        return;
      }
      
      setResult(`Authentication status: ${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      console.error('Auth check error:', err);
      setResult('Error checking authentication');
    }
  };

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Logout failed');
      }
      
      setResult('Logged out successfully');
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully",
      });
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(err.message || 'Failed to logout');
    }
  };

  const testCreateLead = async () => {
    try {
      const testLead = {
        title: "Test Lead " + new Date().toISOString(),
        description: "This is a test lead created from auth debug page",
        location: "Test Location",
        price: 1000,
        totalMembers: 1,
        email: "test@example.com",
        contactNumber: "123-456-7890",
        workType: "full_time",
        duration: "3 months",
        skills: ["Testing", "Debugging"],
        categoryId: 1
      };
      
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testLead),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setResult(`Error creating test lead: ${JSON.stringify(data, null, 2)}`);
        return;
      }
      
      setResult(`Successfully created test lead: ${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      console.error('Lead creation error:', err);
      setResult('Error creating test lead');
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-xl mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Authentication & API Debug Tool</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email">Email</label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password">Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={handleLogin} 
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
              
              <Button 
                onClick={checkAuthStatus} 
                variant="outline"
              >
                Check Auth Status
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button 
                onClick={checkLeadsAPI} 
                variant="outline"
              >
                Test Leads API
              </Button>
              
              <Button 
                onClick={testCreateLead} 
                variant="default"
              >
                Create Test Lead
              </Button>
            </div>
            
            <Button 
              onClick={logout} 
              variant="outline"
              className="w-full mt-2"
            >
              Logout
            </Button>
            
            {result && (
              <div className="mt-4 p-4 bg-gray-100 rounded-md">
                <pre className="whitespace-pre-wrap break-all text-xs overflow-auto max-h-60">
                  {result}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}