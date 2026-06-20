const productService = require('../services/product.service');

/**
 * Product Controller — handles HTTP request/response for products.
 */

/** GET /api/products */
const getAll = async (req, res) => {
  const { search, page, limit } = req.query;
  const result = await productService.getAll({ search, page, limit });

  res.json({
    success: true,
    message: 'Products retrieved successfully',
    ...result,
  });
};

/** GET /api/products/:id */
const getById = async (req, res) => {

  console.log("id: ", req.params.id);
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
  const { name, description, price, stock } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Name and price are required',
    });
  }

  const product = await productService.create({ name, description, price, stock });

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: product,
  });
};

/** PUT /api/products/:id */
const update = async (req, res) => {
  const { name, description, price, stock } = req.body;
  const product = await productService.update(req.params.id, { name, description, price, stock });

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
