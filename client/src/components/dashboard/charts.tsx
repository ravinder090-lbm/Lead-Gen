import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// Chart period filter options
type ChartPeriod = "week" | "month" | "year";

interface ChartData {
  name: string;
  value: number;
}

interface LineChartData {
  date: string;
  value: number;
}

interface LeadGenerationChartProps {
  data: LineChartData[];
  title?: string;
}

export function LeadGenerationChart({ data, title = "Lead Generation" }: LeadGenerationChartProps) {
  const [period, setPeriod] = useState<ChartPeriod>("week");

  // Function to filter data based on period in actual app
  // Here it just uses the provided data
  
  return (
    <Card className="chart-card overflow-hidden bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-sm">
      {/* Glass effect top accent */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-500 opacity-80"></div>
      
      <CardHeader className="px-6 pt-6 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="20" x2="12" y2="10"></line>
                <line x1="18" y1="20" x2="18" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="16"></line>
              </svg>
            </div>
            <CardTitle className="text-lg font-bold text-blue-800">{title}</CardTitle>
          </div>
          
          <div className="flex space-x-1 p-1 bg-blue-50 rounded-lg">
            <Button 
              size="sm" 
              variant={period === "week" ? "default" : "ghost"}
              className={`text-xs px-3 py-1 h-8 rounded-md ${period === "week" ? "bg-blue-600 text-white shadow-md" : "text-blue-700 hover:bg-blue-100"}`}
              onClick={() => setPeriod("week")}
            >
              Week
            </Button>
            <Button 
              size="sm" 
              variant={period === "month" ? "default" : "ghost"}
              className={`text-xs px-3 py-1 h-8 rounded-md ${period === "month" ? "bg-blue-600 text-white shadow-md" : "text-blue-700 hover:bg-blue-100"}`}
              onClick={() => setPeriod("month")}
            >
              Month
            </Button>
            <Button 
              size="sm" 
              variant={period === "year" ? "default" : "ghost"}
              className={`text-xs px-3 py-1 h-8 rounded-md ${period === "year" ? "bg-blue-600 text-white shadow-md" : "text-blue-700 hover:bg-blue-100"}`}
              onClick={() => setPeriod("year")}
            >
              Year
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="h-[280px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 5,
              }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#1a73e8" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e7ff" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={{ stroke: '#e2e8f0' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #e2e8f0'
                }}
                itemStyle={{ color: '#1a73e8' }}
                cursor={{ stroke: '#1a73e8', strokeWidth: 1, strokeDasharray: '5 5' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#1a73e8"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorValue)"
                animationDuration={1500}
                activeDot={{ stroke: 'white', strokeWidth: 2, r: 6, fill: '#1a73e8' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface SubscriptionDistributionChartProps {
  data: ChartData[];
  title?: string;
}

export function SubscriptionDistributionChart({ data, title = "Subscription Distribution" }: SubscriptionDistributionChartProps) {
  const COLORS = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#5f6368'];
  
  return (
    <Card className="chart-card overflow-hidden bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-sm">
      {/* Glass effect top accent */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-500 opacity-80"></div>
      
      <CardHeader className="px-6 pt-6 pb-0">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              <line x1="12" y1="2" x2="12" y2="22"></line>
            </svg>
          </div>
          <CardTitle className="text-lg font-bold text-blue-800">{title}</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="h-[280px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                innerRadius={60}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                animationDuration={1500}
                animationBegin={200}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value} users`, 'Count']}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #e2e8f0'
                }}
              />
              <Legend 
                layout="horizontal" 
                verticalAlign="bottom" 
                align="center"
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ paddingTop: 20 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface UserActivityChartProps {
  data: {
    date: string;
    users: number;
    leads: number;
    tickets: number;
  }[];
  title?: string;
}

export function UserActivityChart({ data, title = "User Activity" }: UserActivityChartProps) {
  return (
    <Card className="chart-card overflow-hidden bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-sm">
      {/* Glass effect top accent */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-500 opacity-80"></div>
      
      <CardHeader className="px-6 pt-6 pb-0">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <CardTitle className="text-lg font-bold text-blue-800">{title}</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="h-[280px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 5,
              }}
              barGap={8}
              barSize={20}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke="#e0e7ff" 
                opacity={0.3} 
              />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={{ stroke: '#e2e8f0' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #e2e8f0'
                }}
                cursor={{ fill: '#f8fafc', opacity: 0.4 }}
              />
              <Legend 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingTop: 20 }}
              />
              <Bar 
                dataKey="users" 
                name="New Users" 
                fill="#1a73e8"
                radius={[4, 4, 0, 0]} 
                animationDuration={1500}
                animationBegin={0}
              />
              <Bar 
                dataKey="leads" 
                name="New Leads" 
                fill="#34a853" 
                radius={[4, 4, 0, 0]}
                animationDuration={1500}
                animationBegin={300}
              />
              <Bar 
                dataKey="tickets" 
                name="Support Tickets" 
                fill="#fbbc04" 
                radius={[4, 4, 0, 0]}
                animationDuration={1500}
                animationBegin={600}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
