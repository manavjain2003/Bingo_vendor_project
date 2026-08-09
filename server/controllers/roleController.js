const Role = require('../models/Role');
const User = require('../models/User');
const { PERMISSIONS } = require('../utils/permissions');

function findInvalidPermissions(permissions) {
  return permissions.filter((p) => {
    if (PERMISSIONS.includes(p)) return false;
    const [resource, action] = p.split('.');
    if (action !== '*') return true;
    return !PERMISSIONS.some((full) => full.startsWith(`${resource}.`));
  });
}

async function listRoles(req, res) {
  try {
    const roles = await Role.find();
    res.json({ items: roles, availablePermissions: PERMISSIONS });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function createRole(req, res) {
  try {
    const { name, permissions } = req.body;

    if (!name || !Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).json({ message: 'name and a non-empty permissions array are required' });
    }

    const invalid = findInvalidPermissions(permissions);
    if (invalid.length) {
      return res.status(400).json({ message: `Unknown permissions: ${invalid.join(', ')}` });
    }

    const role = await Role.create({ name, permissions });
    res.status(201).json(role);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function updateRole(req, res) {
  try {
    const { name, permissions } = req.body;

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    if (permissions) {
      const invalid = findInvalidPermissions(permissions);
      if (invalid.length) {
        return res.status(400).json({ message: `Unknown permissions: ${invalid.join(', ')}` });
      }
      role.permissions = permissions;
    }

    if (name) role.name = name;

    await role.save();
    res.json(role);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

async function assignRole(req, res) {
  try {
    const { userId, roleId } = req.body;

    if (!userId || !roleId) {
      return res.status(400).json({ message: 'userId and roleId are required' });
    }

    const user = await User.findById(userId);
    const role = await Role.findById(roleId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!role) return res.status(404).json({ message: 'Role not found' });

    user.role = role._id;
    await user.save();
    res.json({ id: user._id, role: role.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

module.exports = { listRoles, createRole, updateRole, assignRole };
