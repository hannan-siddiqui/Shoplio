const productService = require('../services/product.service');
const categoryService = require('../services/category.service');
const collectionService = require('../services/collection.service');

/** GET /api/products */
const getAll = async (req, res) => {
  const { search, category_id, collection, page, limit } = req.query;

  // Resolve collection slug → id if provided
  let collection_id;
  if (collection) {
    const col = await collectionService.getBySlug(collection);
    if (!col) {
      return res.status(404).json({
        success: false,
        message: `Collection with slug "${collection}" not found`,
      });
    }
    collection_id = col.id;
  }

  const result = await productService.getAll({ search, category_id, collection_id, page, limit });

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
  const { name, description, price, stock, category_id, categoryIds: rawCatIds, collectionIds } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Name and price are required',
    });
  }

  // Support both legacy category_id (single) and new categoryIds (array)
  let categoryIds = rawCatIds || [];
  if (!rawCatIds && category_id) {
    categoryIds = [category_id];
  }

  // Validate that all referenced categories exist
  for (const id of categoryIds) {
    const exists = await categoryService.exists(id);
    if (!exists) {
      return res.status(400).json({
        success: false,
        message: `Category with id ${id} not found`,
      });
    }
  }

  // Validate that all referenced collections exist
  const colIds = collectionIds || [];
  for (const id of colIds) {
    const exists = await collectionService.exists(id);
    if (!exists) {
      return res.status(400).json({
        success: false,
        message: `Collection with id ${id} not found`,
      });
    }
  }

  const product = await productService.create({
    name,
    description,
    price,
    stock,
    categoryIds,
    collectionIds: colIds,
  });

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: product,
  });
};

/** PUT /api/products/:id */
const update = async (req, res) => {
  const { name, description, price, stock, category_id, categoryIds: rawCatIds, collectionIds } = req.body;

  // Support both legacy category_id (single) and new categoryIds (array)
  let categoryIds = rawCatIds;
  if (rawCatIds === undefined && category_id !== undefined) {
    categoryIds = [category_id];
  }

  // Validate categories if provided
  if (categoryIds !== undefined) {
    for (const id of categoryIds) {
      const exists = await categoryService.exists(id);
      if (!exists) {
        return res.status(400).json({
          success: false,
          message: `Category with id ${id} not found`,
        });
      }
    }
  }

  // Validate collections if provided
  if (collectionIds !== undefined) {
    for (const id of collectionIds) {
      const exists = await collectionService.exists(id);
      if (!exists) {
        return res.status(400).json({
          success: false,
          message: `Collection with id ${id} not found`,
        });
      }
    }
  }

  const product = await productService.update(req.params.id, {
    name,
    description,
    price,
    stock,
    categoryIds,
    collectionIds,
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
