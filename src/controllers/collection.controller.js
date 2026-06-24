const collectionService = require('../services/collection.service');

const getAll = async (req, res) => {
  const { search, page, limit } = req.query;
  const result = await collectionService.getAll({ search, page, limit });

  res.json({
    success: true,
    message: 'Collections retrieved successfully',
    ...result,
  });
};

const getById = async (req, res) => {
  const collection = await collectionService.getById(req.params.id);

  if (!collection) {
    return res.status(404).json({
      success: false,
      message: `Collection with id ${req.params.id} not found`,
    });
  }

  res.json({
    success: true,
    message: 'Collection retrieved successfully',
    data: collection,
  });
};

const create = async (req, res) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Collection name is required',
    });
  }

  try {
    const collection = await collectionService.create({ name: name.trim(), description });
    res.status(201).json({
      success: true,
      message: 'Collection created successfully',
      data: collection,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'A collection with this name already exists',
      });
    }
    throw error;
  }
};

const update = async (req, res) => {
  const { name, description } = req.body;

  try {
    const collection = await collectionService.update(req.params.id, { name, description });

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: `Collection with id ${req.params.id} not found`,
      });
    }

    res.json({
      success: true,
      message: 'Collection updated successfully',
      data: collection,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'A collection with this name already exists',
      });
    }
    throw error;
  }
};

const remove = async (req, res) => {
  const collection = await collectionService.remove(req.params.id);

  if (!collection) {
    return res.status(404).json({
      success: false,
      message: `Collection with id ${req.params.id} not found`,
    });
  }

  res.json({
    success: true,
    message: 'Collection deleted successfully',
    data: collection,
  });
};

module.exports = { getAll, getById, create, update, remove };
