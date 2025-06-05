import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginTest() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password123");
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
      
      setResult(JSON.stringify(data, null, 2));
      toast({
        title: "Login Successful",
        description: `Welcome back, ${data.name || 'User'}!`,
      });
      
      // Check auth status
      checkAuthStatus();
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
      
      setResult('Authenticated as: ' + JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Auth check error:', err);
      setResult('Error checking authentication');
    }
  };

  const checkLeadsAPI = async () => {
    try {
      const response = await fetch('/api/leads', {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setResult('Error accessing leads: ' + JSON.stringify(data, null, 2));
        return;
      }
      
      setResult('Leads API response: ' + JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Leads API error:', err);
      setResult('Error checking leads API');
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

  return (
    <div className="container max-w-md mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test</CardTitle>
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
          
          <div className="flex flex-col gap-2">
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
            
            <Button 
              onClick={checkLeadsAPI} 
              variant="outline"
            >
              Test Leads API
            </Button>
            
            <Button 
              onClick={logout} 
              variant="outline"
              className="mt-2"
            >
              Logout
            </Button>
          </div>
          
          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md">
              <pre className="whitespace-pre-wrap break-all text-xs">
                {result}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}