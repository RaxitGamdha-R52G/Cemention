export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPhone = (phone) => {
  if (phone.startsWith('+91')) return phone;
  if (phone.startsWith('91')) return `+${phone}`;
  return `+91${phone}`;
};

export const getRoleName = (role) => {
  const roleMap = {
    DEALER: 'Dealer',
    RETAILER: 'Retailer',
    CUSTOMER: 'Customer',
    ADMIN: 'Admin',
  };
  return roleMap[role] || role;
};

export const getStatusColor = (status) => {
  const colors = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    RECEIVED: 'bg-green-100 text-green-800 border-green-200',
    FAILED: 'bg-red-100 text-red-800 border-red-200',
    DELIVERED: 'bg-green-100 text-green-800 border-green-200',
    CANCELLED: 'bg-red-100 text-red-800 border-red-200',
    ASSIGNED: 'bg-blue-100 text-blue-800 border-blue-200',
    OUT_FOR_DELIVERY: 'bg-blue-100 text-blue-800 border-blue-200',
    PAYMENT_RECEIVED: 'bg-green-100 text-green-800 border-green-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};
