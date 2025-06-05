import Swal from 'sweetalert2';

export const confirmDelete = async (title = 'Are you sure?', text = 'This action cannot be undone.') => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#1a73e8',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel'
  });

  return result.isConfirmed;
};

export const confirmLogout = async () => {
  const result = await Swal.fire({
    title: 'Logout',
    text: 'Are you sure you want to logout?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#1a73e8',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, logout',
    cancelButtonText: 'Cancel'
  });

  return result.isConfirmed;
};

export const confirmAction = async (title: string, text: string, confirmButtonText = 'Yes') => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#1a73e8',
    cancelButtonColor: '#d33',
    confirmButtonText,
    cancelButtonText: 'Cancel'
  });

  return result.isConfirmed;
};

export const showSuccess = (title: string, text?: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonColor: '#1a73e8',
  });
};

export const showError = (title: string, text?: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonColor: '#1a73e8',
  });
};

export const showInfo = (title: string, text?: string) => {
  return Swal.fire({
    title,
    text,
    icon: 'info',
    confirmButtonColor: '#1a73e8',
  });
};