const productService = require('../services/product.service');
const categoryService = require('../services/category.service');

/** GET /api/products */
const getAll = async (req, res) => {
  const { search, category_id, page, limit } = req.query;
  const result = await productService.getAll({ search, category_id, page, limit });

  res.json({
    success: true,
    message: 'Products retrieved successfully',
    ...result,
  });
};

/** GET /api/products/:id */
const getById = async (req, res) => {
  const product = await productService.getById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: `Product with id ${req.params.id} not found`,
    });
  }

  res.json({
    success: true,
    message: 'Product retrieved successfully',
    data: product,
  });
};

/** POST /api/products */
const create = async (req, res) => {
  const { name, description, price, stock, category_id } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Name and price are required',
    });
  }

  if (!category_id) {
    return res.status(400).json({
      success: false,
      message: 'category_id is required',
    });
  }

  const categoryExists = await categoryService.exists(category_id);
  if (!categoryExists) {
    return res.status(400).json({
      success: false,
      message: `Category with id ${category_id} not found`,
    });
  }

  const product = await productService.create({
    name,
    description,
    price,
    stock,
    category_id,
  });

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: product,
  });
};

/** PUT /api/products/:id */
const update = async (req, res) => {
  const { name, description, price, stock, category_id } = req.body;

  if (category_id !== undefined) {
    const categoryExists = await categoryService.exists(category_id);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: `Category with id ${category_id} not found`,
      });
    }
  }

  const product = await productService.update(req.params.id, {
    name,
    description,
    price,
    stock,
    category_id,
  });

  if (!product) {
    return res.status(404).json({
      success: false,
      message: `Product with id ${req.params.id} not found`,
    });
  }

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: product,
  });
};

/** DELETE /api/products/:id */
const remove = async (req, res) => {
  const product = await productService.remove(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: `Product with id ${req.params.id} not found`,
    });
  }

  res.json({
    success: true,
    message: 'Product deleted successfully',
    data: product,
  });
};

module.exports = { getAll, getById, create, update, remove };
