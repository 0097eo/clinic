const asyncHandler = require('../utils/asyncHandler');
const prisma = require('../utils/prisma');

const listEmployees = asyncHandler(async (req, res) => {
  const filters = {};
  if (req.query.role) {
    filters.role = req.query.role;
  }

  const employees = await prisma.employee.findMany({
    where: filters,
    orderBy: { fullName: 'asc' },
    select: {
      id: true,
      fullName: true,
      role: true,
      department: true,
      email: true,
      phone: true
    }
  });

  res.json({ data: employees });
});

module.exports = {
  listEmployees
};
