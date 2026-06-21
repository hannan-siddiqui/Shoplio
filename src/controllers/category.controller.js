const categoryService = require('../services/category.service');

const getAll = async (req, res) => {
  const { search, page, limit } = req.query;
  const result = await categoryService.getAll({ search, page, limit });

  res.json({
    success: true,
    message: 'Categories retrieved successfully',
    ...result,
  });
};

const getById = async (req, res) => {
  const category = await categoryService.getById(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: `Category with id ${req.params.id} not found`,
    });
  }

  res.json({
    success: true,
    message: 'Category retrieved successfully',
    data: category,
  });
};

const create = async (req, res) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Category name is required',
    });
  }

  try {
    const category = await categoryService.create({ name: name.trim(), description });
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists',
      });
    }
    throw error;
  }
};

const update = async (req, res) => {
  const { name, description } = req.body;

  try {
    const category = await categoryService.update(req.params.id, { name, description });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category with id ${req.params.id} not found`,
      });
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists',
      });
    }
    throw error;
  }
};

const remove = async (req, res) => {
  const category = await categoryService.remove(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: `Category with id ${req.params.id} not found`,
    });
  }

  res.json({
    success: true,
    message: 'Category deleted successfully',
    data: category,
  });
};

module.exports = { getAll, getById, create, update, remove };
