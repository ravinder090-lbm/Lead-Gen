import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { UserTable } from "@/components/users/user-table";
import { UserForm } from "@/components/users/user-form";
import { UserStatusForm } from "@/components/users/user-status-form";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";
import { type User } from "@shared/schema";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminUsers() {
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsEditUserOpen(true);
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          User Management
        </h1>
        <div className="flex gap-2">
          <ExportButton 
            endpoint="/api/export/users" 
            label="Export Users" 
            variant="outline"
            className="bg-white hover:bg-gray-100"
          />
          {/* <Button onClick={() => setIsCreateUserOpen(true)}>
            <i className="ri-user-add-line mr-1"></i>
            Add User
          </Button> */}
        </div>
      </div>

      <UserTable onEdit={handleEdit} />

      {/* Create User Sidebar */}
      <Sheet open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create New User</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <UserForm onSuccess={() => setIsCreateUserOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit User Sidebar */}
      <Sheet open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit User</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {selectedUser && (
              <Tabs defaultValue="profile">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="profile">Profile Info</TabsTrigger>
                  <TabsTrigger value="status">Status</TabsTrigger>
                </TabsList>
                <TabsContent value="profile">
                  <UserForm
                    isEdit
                    userId={selectedUser.id}
                    defaultValues={{
                      name: selectedUser.name,
                      email: selectedUser.email,
                      role: selectedUser.role,
                      status: selectedUser.status,
                    }}
                    onSuccess={() => setIsEditUserOpen(false)}
                  />
                </TabsContent>
                <TabsContent value="status">
                  <UserStatusForm
                    userId={selectedUser.id}
                    defaultValues={{
                      status: selectedUser.status,
                    }}
                    onSuccess={() => setIsEditUserOpen(false)}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
