// @bun
var __legacyDecorateClassTS = function(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
    r = Reflect.decorate(decorators, target, key, desc);
  else
    for (var i = decorators.length - 1;i >= 0; i--)
      if (d = decorators[i])
        r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};

// src/core/entity/entity.ts
import { MaterializeIt as MaterializeIt2 } from "@laborci/util";

// src/core/helper.ts
import { MetadataLibrary } from "@laborci/util";
import { eq, sql } from "drizzle-orm";
import { int } from "drizzle-orm/mysql-core";
var metal = new MetadataLibrary;
function In(col, ids) {
  return sql`${col}
   in (
   ${sql.placeholder(ids)}
   )`;
}
function stmt(stmt2, ...processes) {
  let prepared = stmt2.prepare();
  return async (args) => {
    let result = await prepared.execute(args);
    for (const process of processes)
      result = await process(result);
    return result;
  };
}
var likeString = {
  startsWith: (search) => search + "%",
  endWith: (search) => "%" + search,
  contains: (search) => "%" + search + "%"
};
function getByFactory(repo, fieldName) {
  let field = repo.schema[fieldName];
  let stmt2 = repo.db.select().from(repo.schema).where(eq(field, sql.placeholder("search"))).limit(1).prepare();
  let fn = async (search) => {
    let data = await stmt2.execute({ search });
    if (data.length === 0)
      return;
    else
      return await repo.instantiate.one(data[0]);
  };
  fn.stmt = stmt2;
  return fn;
}
function getAllByFactory(repo, fieldName) {
  let field = repo.schema[fieldName];
  let stmt2 = repo.db.select().from(repo.schema).where(eq(field, sql.placeholder("search"))).prepare();
  let fn = async (search) => {
    let data = await stmt2.execute({ search });
    if (data.length === 0)
      return [];
    else
      return await repo.instantiate.all(data);
  };
  fn.stmt = stmt2;
  return fn;
}
async function prevDto(state, repository) {
  if (!state.prevDto)
    state.prevDto = await repository.getRawDTO(state.item.id);
  return state.prevDto;
}
var EXPORT_KEY = Symbol("EXPORT");
function Export(t, p) {
  metal.add(EXPORT_KEY, p, t);
}
Export.read = (t) => metal.get(EXPORT_KEY, t) || [];
var IMPORT_KEY = Symbol("IMPORT");
function Import(t, p) {
  metal.add(IMPORT_KEY, p, t);
}
Import.read = (t) => metal.get(IMPORT_KEY, t) || [];
var stormSchemaHelpers = {
  id: function() {
    return int("id").autoincrement().primaryKey();
  },
  reference: function(name, field, nullable = false) {
    return nullable ? int(name).references(field) : int(name).notNull().references(field);
  }
};
var stormSqlHelpers = {
  like: function(col, key) {
    return sql`LOWER(
      ${col}
      )
      like
      LOWER
      (
      ${likeString.contains(key)}
      )`;
  },
  in: function(col, array) {
    return sql`${col}
      in (
      ${array}
      )`;
  }
};

// src/core/entity/view-entity.ts
import { MaterializeIt, omitFieldsIP, pickFieldsIP } from "@laborci/util";

// src/core/error.ts
import { err, errorGroup } from "@laborci/util";
var entityError = {
  itemNotFound: (repository, id) => err("Item not found", { repository, id }, 404),
  itemNotExists: () => err("Entity doesn't exist yet!", undefined, 404),
  duplicateEntry: (args) => err("Duplicate Entry", { originalError: args }, 409)
};
errorGroup(entityError, "STORM_ENTITY");

// src/core/entity/view-entity.ts
class ViewEntity {
  static repository;
  get $repository() {
    return this.constructor.repository;
  }
  get $id() {
    if (this.id)
      return this.id;
    throw entityError.itemNotExists();
  }
  constructor() {
    this.id = null;
  }
  static get exportFields() {
    return Export.read(this.constructor);
  }
  $export() {
    const e = {};
    let a = Export.read(this.constructor);
    if (a)
      for (const key of a) {
        e[key] = typeof this[key] === "object" && this[key] !== null && typeof this[key].toJSON === "function" ? this[key].toJSON() : this[key];
      }
    return e;
  }
  $pick(...fields) {
    let res = this.$export();
    pickFieldsIP(res, ...fields);
    return res;
  }
  $omit(...fields) {
    let res = this.$export();
    omitFieldsIP(res, ...fields);
    return res;
  }
  toJSON() {
    return this.$export();
  }
  toString() {
    return `${this.constructor.name}(${this.id})`;
  }
}
__legacyDecorateClassTS([
  Export
], ViewEntity.prototype, "id", undefined);
__legacyDecorateClassTS([
  MaterializeIt
], ViewEntity, "exportFields", null);

// src/core/entity/entity.ts
class Entity extends ViewEntity {
  static repository;
  get $repository() {
    return this.constructor.repository;
  }
  static get importFields() {
    return Import.read(this.constructor);
  }
  $import(importData, onlyDecoratedProperties = true) {
    let importFields = Import.read(this.constructor);
    for (const key in importData)
      if (importFields?.includes(key) || !onlyDecoratedProperties)
        this[key] = importData[key];
    return this;
  }
  $save(saveData, onlyDecoratedProperties = false) {
    return (saveData ? this.$import(saveData, onlyDecoratedProperties) : this).$repository.save(this);
  }
  $delete() {
    return this.$repository.delete(this);
  }
  $overwrite(data) {
    return this.$repository.overwrite(this, data);
  }
}
__legacyDecorateClassTS([
  MaterializeIt2
], Entity, "importFields", null);
// src/core/entity/entity-repository.ts
import { omitFieldsIP as omitFieldsIP2, pickFieldsIP as pickFieldsIP2, ProcessPipeline as ProcessPipeline2 } from "@laborci/util";
import { sql as sql3 } from "drizzle-orm";

// src/core/entity/view-entity-repository.ts
import { firstOrUndefined, MaterializeIt as MaterializeIt3, ProcessPipeline } from "@laborci/util";
import { sql as sql2 } from "drizzle-orm";
class ViewEntityRepository {
  db;
  schema;
  entity;
  fields;
  pipelines;
  instantiate;
  exec;
  constructor(db, schema, entity) {
    this.db = db;
    this.schema = schema;
    this.entity = entity;
    this.fields = Object.keys(schema);
    entity.repository = this;
    this.pipelines = this.pipelineFactory();
    this.instantiate = this.instantiateFactory();
    this.exec = this.pipelineExecFactory();
    this.initialize();
  }
  addPlugin(plugin) {
    plugin(this);
    return this;
  }
  initialize() {
  }
  get stmt_all() {
    return stmt(this.db.select().from(this.schema));
  }
  get stmt_get_array() {
    return stmt(this.db.select().from(this.schema).where(sql2`id IN (${sql2.placeholder("ids")})`));
  }
  get stmt_get() {
    return stmt(this.db.select().from(this.schema).where(sql2`id = ${sql2.placeholder("id")}`).limit(1), firstOrUndefined);
  }
  pipelineFactory() {
    return {
      getOne: new ProcessPipeline("prepare", "action", "finalize").setup({
        action: async (state) => {
          if (state.dto === undefined)
            state.dto = await this.stmt_get({ id: state.id });
        },
        finalize: async (state) => {
          if (state.dto !== undefined)
            state.item = await this.instantiate.one(state.dto);
        }
      }),
      getArray: new ProcessPipeline("prepare", "action", "finalize").setup({
        action: async (state) => {
          if (state.dtos === undefined)
            state.dtos = [];
          state.dtos.push(...await this.stmt_get_array({ ids: state.ids }));
        },
        finalize: async (state) => {
          state.items = await this.instantiate.all(state.dtos);
        }
      }),
      getAll: new ProcessPipeline("prepare", "action", "finalize").setup({
        action: async (state) => {
          if (state.dtos === undefined)
            state.dtos = [];
          state.dtos.push(...await this.stmt_all(undefined));
        },
        finalize: async (state) => {
          state.items = await this.instantiate.all(state.dtos);
        }
      })
    };
  }
  pipelineExecFactory() {
    return {
      getOne: async (id) => {
        return await this.pipelines.getOne.run(this, { id }).then((state) => state.item);
      },
      getArray: async (ids) => {
        return this.pipelines.getArray.run(this, { ids }).then((state) => state.items);
      },
      getAll: async () => {
        return this.pipelines.getAll.run(this, {}).then((state) => state.items);
      }
    };
  }
  instantiateFactory() {
    return {
      all: async (dtoSet) => {
        const instances = [];
        for (let dto of dtoSet) {
          let instance = await this.instantiate.one(dto);
          if (instance !== undefined)
            instances.push(instance);
        }
        return instances;
      },
      first: async (dtoSet) => {
        return await this.instantiate.one(firstOrUndefined(dtoSet));
      },
      one: async (dto) => {
        if (dto === undefined)
          return;
        let item = await this.create();
        await this.applyItemDTO(item, dto);
        return item;
      }
    };
  }
  transformItemDTO(dto) {
  }
  async applyItemDTO(item, dto) {
    this.transformItemDTO(dto);
    Object.assign(item, dto);
  }
  async getRawDTO(id) {
    return id ? this.stmt_get({ id }) : undefined;
  }
  async get(id) {
    if (arguments.length === 0)
      return this.exec.getAll();
    if (Array.isArray(id)) {
      if (id.length === 0)
        return [];
      id = [...new Set(id)];
      return this.exec.getArray(id);
    } else {
      if (id === undefined || id === null)
        return;
      return this.exec.getOne(id);
    }
  }
  async create() {
    return new this.entity(this);
  }
  async reload(item) {
    await this.getRawDTO(item.id).then((dto) => {
      dto && this.applyItemDTO(item, dto);
    });
  }
}
__legacyDecorateClassTS([
  MaterializeIt3
], ViewEntityRepository.prototype, "stmt_all", null);
__legacyDecorateClassTS([
  MaterializeIt3
], ViewEntityRepository.prototype, "stmt_get_array", null);
__legacyDecorateClassTS([
  MaterializeIt3
], ViewEntityRepository.prototype, "stmt_get", null);

// src/core/entity/entity-repository.ts
class EntityRepository extends ViewEntityRepository {
  pipelineFactory() {
    return {
      ...super.pipelineFactory(),
      insert: new ProcessPipeline2("prepare", "action", "finalize").setup({
        prepare: async (state) => {
          state.dto = await this.getInsertDTO(state.item);
        },
        action: async (state) => {
          await this.db.insert(this.schema).values(state.dto).execute().then((res) => state.insertId = res[0].insertId);
        },
        finalize: async (state) => {
          state.item.id = state.insertId;
          await this.reload(state.item);
        }
      }),
      update: new ProcessPipeline2("prepare", "action", "finalize").setup({
        prepare: async (state) => {
          state.dto = await this.getUpdateDTO(state.item);
        },
        action: async (state) => {
          await this.db.update(this.schema).set(state.dto).where(sql3`id = ${sql3.placeholder("id")}`).execute({ id: state.item.id });
        },
        finalize: async (state) => {
          await this.reload(state.item);
        }
      }),
      delete: new ProcessPipeline2("prepare", "action", "finalize").setup({
        action: async (state) => {
          await this.db.delete(this.schema).where(sql3`id = (${sql3.placeholder("id")})`).execute({ id: state.item.id });
        },
        finalize: (state) => {
          state.item.id = undefined;
        }
      }),
      overwrite: new ProcessPipeline2("prepare", "action", "finalize").setup({
        action: async (state) => {
          await this.db.update(this.schema).set(state.values).where(sql3`id = ${sql3.placeholder("id")}`).execute({ id: state.item.id });
        },
        finalize: async (state) => {
          state.reload && await this.reload(state.item);
        }
      })
    };
  }
  pipelineExecFactory() {
    return {
      ...super.pipelineExecFactory(),
      delete: async (item) => {
        return await this.pipelines.delete.run(this, { item });
      },
      insert: async (item) => {
        await this.pipelines.insert.run(this, { item }).then((res) => res.insertId);
        return item;
      },
      update: async (item) => {
        await this.pipelines.update.run(this, { item });
        return item;
      },
      overwrite: async (item, values, reload = true) => {
        await this.pipelines.overwrite.run(this, { item, values, reload });
        return item;
      }
    };
  }
  pipelines;
  exec;
  constructor(db, schema, entity) {
    super(db, schema, entity);
    this.pipelines = this.pipelineFactory();
    this.exec = this.pipelineExecFactory();
    this.instantiate = this.instantiateFactory();
    this.initialize();
  }
  initialize() {
  }
  addPlugin(plugin) {
    plugin(this);
    return this;
  }
  extractItemDTO(item) {
    return Object.assign({}, item);
  }
  async getInsertDTO(item) {
    let dto = this.extractItemDTO(item);
    await this.transformInsertDTO(dto);
    return dto;
  }
  async getUpdateDTO(item) {
    let dto = this.extractItemDTO(item);
    await this.transformUpdateDTO(dto);
    return dto;
  }
  transformSaveDTO(dto) {
    pickFieldsIP2(dto, ...this.fields);
    omitFieldsIP2(dto, "id");
  }
  transformInsertDTO(dto) {
    this.transformSaveDTO(dto);
  }
  transformUpdateDTO(dto) {
    this.transformSaveDTO(dto);
  }
  transformItemDTO(dto) {
  }
  async applyItemDTO(item, dto) {
    this.transformItemDTO(dto);
    Object.assign(item, dto);
  }
  async create(importData, onlyDecoratedProperties = true) {
    let item = new this.entity(this);
    if (importData)
      item.$import(importData, onlyDecoratedProperties);
    return item;
  }
  async save(item) {
    try {
      if (item)
        return item.id ? await this.update(item) : await this.insert(item);
    } catch (e) {
      if (e.errno === 1062)
        throw entityError.duplicateEntry(e);
      else
        throw e;
    }
  }
  async update(item) {
    if (item)
      return this.exec.update(item);
  }
  async insert(item) {
    if (item)
      return this.exec.insert(item);
  }
  async overwrite(item, values, reload = true) {
    if (item)
      return this.exec.overwrite(item, values, reload);
  }
  async delete(item) {
    if (item)
      return this.exec.delete(item);
  }
}
// src/extensions/plugin.storage/attachment.ts
import fs from "fs";
import path from "path";
import { mimeTypeMap } from "@laborci/util";

class Attachment {
  #collection;
  #entityId;
  #name;
  #id;
  #size;
  #metadata;
  metadata;
  get size() {
    return this.#size;
  }
  get id() {
    return this.#id;
  }
  get name() {
    return this.#name;
  }
  get collection() {
    return this.#collection;
  }
  get entityId() {
    return this.#entityId;
  }
  get path() {
    return this.collection.getPath(this.#entityId);
  }
  async base64() {
    let filePath = path.join(this.path, this.name);
    let buffer = await fs.promises.readFile(filePath);
    return buffer.toString("base64");
  }
  async dataUrl() {
    let filePath = path.join(this.path, this.name);
    let buffer = await fs.promises.readFile(filePath);
    return "data:" + mimeTypeMap[path.extname(this.name)] + ";base64," + buffer.toString("base64");
  }
  constructor(attachmentObject, collection, entityId) {
    this.#entityId = entityId;
    this.#collection = collection;
    this.#name = attachmentObject.name;
    this.#id = attachmentObject.id;
    this.#size = attachmentObject.size;
    this.#metadata = attachmentObject.metadata;
    this.metadata = new Proxy(this.#metadata, {
      get: (target, prop) => target[prop.toString()],
      set: (target, prop, value) => {
        let p = prop.toString();
        if (collection.writableMetaFields.hasOwnProperty(p)) {
          target[p] = value;
          return true;
        }
        return false;
      }
    });
  }
  toJSON() {
    return {
      metadata: this.metadata,
      name: this.name,
      id: this.id,
      size: this.#size
    };
  }
  async saveMetaData() {
    await this.collection.storage.updateMetadata(this.collection.name, this.entityId, this.name, this.#metadata);
  }
  async setPositions(position) {
    await this.collection.storage.setPosition(this.collection.name, this.entityId, this.name, position);
  }
  async delete() {
    await this.collection.storage.delete(this.collection.name, this.entityId, this.name);
  }
  async rename(name) {
    await this.collection.storage.rename(this.collection.name, this.entityId, this.name, name);
  }
}
// src/extensions/plugin.storage/collection.ts
import { bytes } from "@laborci/util";
import fs2 from "fs";
import { minimatch as minimatch2 } from "minimatch";
import Path from "path";

// src/extensions/plugin.storage/collection-handler.ts
import { minimatch } from "minimatch";

class CollectionHandler extends Array {
  #collection;
  #entity;
  loaded = false;
  get entity() {
    return this.#entity;
  }
  get id() {
    return this.#entity.id;
  }
  get collection() {
    return this.#collection;
  }
  get storage() {
    return this.#collection.storage;
  }
  constructor(collection, entity2) {
    super();
    this.#collection = collection;
    this.#entity = entity2;
  }
  push(...args) {
    throw Error(`can not push into collection handler ${this.collection.name}`);
  }
  unshift(...args) {
    throw Error(`can not unshift collection handler ${this.collection.name}`);
  }
  pop() {
    throw Error(`can not pop from collection handler ${this.collection.name}`);
  }
  shift() {
    throw Error(`can not shift from collection handler ${this.collection.name}`);
  }
  async load() {
    this.loaded = true;
    this.length = 0;
    super.push(...await this.collection.get(this.entity.id));
    return this;
  }
  async add(file) {
    await this.load();
    const prepared = await this.collection.prepare(this, file);
    await this.collection.storage.add(this.collection.name, this.entity.id, prepared.file, prepared.metadata);
    await prepared.file.release();
    await this.load();
  }
  toJSON() {
    return {
      collection: this.collection.name,
      rules: this.collection.rules,
      id: this.id,
      files: this.loaded ? [...this] : null
    };
  }
  first() {
    return this.at(0);
  }
  last() {
    return this.at(-1);
  }
  findFile(filename) {
    return this.find((obj) => filename === obj.name);
  }
  findFiles(glob) {
    return this.filter((obj) => minimatch(obj.name, glob));
  }
}

// src/extensions/plugin.storage/helper/error.ts
import { err as err2, errorGroup as errorGroup2 } from "@laborci/util";
var storageError = {
  ownerNotExists: (name, id) => err2("file can not be added to non existing owner", { name, id }, 500),
  fileTooLarge: (name, id, filename, sizeLimit) => err2("file size is too large", { name, id, filename, sizeLimit }, 500),
  extensionNotAllowed: (name, id, filename, allowedExtensions) => err2("file extension is not allowed", { name, id, filename, allowedExtensions }, 500),
  tooManyFiles: (name, id, filename, limit) => err2("no more storage allowed", { name, id, filename, limit }, 500),
  attachedFileNotFound: (name, id, filename) => err2("attached file not found", { name, id, filename }, 500)
};
errorGroup2(storageError, "STORM_STORAGE");

// src/extensions/plugin.storage/collection.ts
import { mimeTypeMap as mimeTypeMap2 } from "@laborci/util";

class Collection {
  name;
  groupDefinition;
  entityRepository;
  group;
  _storage;
  get storage() {
    return this._storage;
  }
  getPath(entityId) {
    return this.storage.getPath(this.name, entityId);
  }
  writableMetaFields = {};
  rules;
  constructor(name, groupDefinition, rules) {
    this.name = name;
    this.groupDefinition = groupDefinition;
    this._storage = groupDefinition.storage;
    this.group = groupDefinition.group;
    this.name = `${this.group}.${this.name}`;
    this.entityRepository = groupDefinition.entityRepository;
    if (typeof rules.ext === "string")
      rules.ext = [rules.ext];
    if (typeof rules.mime === "string")
      rules.mime = [rules.mime];
    if (typeof rules.limit === "undefined")
      rules.limit = {};
    if (typeof rules.limit.count === "undefined")
      rules.limit.count = 1;
    if (typeof rules.limit.size === "undefined")
      rules.limit.size = "1mb";
    rules.limit.size = bytes(rules.limit.size);
    this.rules = rules;
    if (this.rules.mime !== undefined) {
      if (!Array.isArray(this.rules.ext))
        this.rules.ext = [];
      for (const mime of this.rules.mime) {
        for (const ext in mimeTypeMap2) {
          if (minimatch2(mimeTypeMap2[ext], mime))
            this.rules.ext.push(ext);
        }
      }
      if (rules.ext?.length === 0)
        rules.ext = undefined;
    }
    this._storage.addCollection(this);
  }
  handler(entity2) {
    return entity2.id ? new CollectionHandler(this, entity2) : undefined;
  }
  async updateMetadata(id, filename, metadata) {
    await this._storage.updateMetadata(this.name, id, filename, metadata);
  }
  async prepareFile(file) {
    return { file, metadata: {} };
  }
  async prepare(collectionHandler, file) {
    let metadata;
    const ext = Path.extname(file.filename);
    const filename = Path.basename(file.filename);
    const stat = await fs2.promises.stat(file.file);
    let id = collectionHandler.id;
    if (await this.entityRepository.get(id) === undefined)
      throw storageError.ownerNotExists(this.name, id);
    if (collectionHandler.length >= this.rules.limit.count)
      throw storageError.tooManyFiles(this.name, id, filename, this.rules.limit.count);
    if (this.rules.ext !== undefined && !this.rules.ext.includes(ext))
      throw storageError.extensionNotAllowed(this.name, id, filename, this.rules.ext);
    ({ file, metadata } = await this.prepareFile(file));
    let size = stat.size;
    if (size > this.rules.limit.size)
      throw storageError.fileTooLarge(this.name, id, filename, this.rules.limit.size);
    return { file, metadata };
  }
  async onDelete() {
  }
  async onModify() {
  }
  async get(id) {
    let attachmentObjects = await this._storage.get(this.name, id);
    return attachmentObjects.map((attachmentObject) => new Attachment(attachmentObject, this, id));
  }
}
// src/extensions/plugin.storage/storage.ts
import { fileExists, firstOrUndefined as firstOrUndefined2, getUniqueFilename, MaterializeIt as MaterializeIt4, removeEmptyParentDirectories, sanitizeFilename } from "@laborci/util";
import { and, eq as eq2, sql as sql4 } from "drizzle-orm";
import fs3 from "fs";
import Path2 from "path";
class Storage {
  path2;
  db;
  schema;
  cache;
  cleanup;
  constructor(path2, db, schema, cache, cleanup) {
    this.path = path2;
    this.db = db;
    this.schema = schema;
    this.cache = cache;
    this.cleanup = cleanup;
  }
  collections = {};
  groups = {};
  addCollection(collection) {
    if (this.collections[collection.name] !== undefined)
      throw new Error(`collection name must be unique! ${collection.name}`);
    this.collections[collection.name] = collection;
    if (this.groups[collection.group] === undefined)
      this.groups[collection.group] = { repository: collection.entityRepository, collections: {} };
    this.groups[collection.group].collections[collection.name] = collection;
  }
  getGroupDefinition(name, entityRepository) {
    return {
      storage: this,
      group: name,
      entityRepository
    };
  }
  get stmt_get() {
    return stmt(this.db.select().from(this.schema).where(and(sql4`name = ${sql4.placeholder("name")}`, sql4`itemId = ${sql4.placeholder("id")}`)).limit(1), firstOrUndefined2);
  }
  get stmt_all() {
    return stmt(this.db.select().from(this.schema).where(and(sql4`itemId IN (${sql4.placeholder("ids")})`, sql4`name = ${sql4.placeholder("name")}`)));
  }
  get stmt_del() {
    return stmt(this.db.delete(this.schema).where(and(sql4`itemId = (${sql4.placeholder("id")})`, sql4`name = ${sql4.placeholder("name")}`)));
  }
  getPath(name, id) {
    return Path2.resolve(this.path, name, id.toString(36).padStart(6, "0").match(/.{1,2}/g).join("/"));
  }
  getCacheKey(name, id) {
    return `${name}-${id}`;
  }
  async get(name, id, res = {}) {
    let record = await this.cache?.get(this.getCacheKey(name, id));
    if (record) {
      res.found = "cache";
      return JSON.parse(record.data);
    }
    record = await this.stmt_get({ name, id });
    if (record) {
      res.found = "db";
      this.cache?.set({ key: this.getCacheKey(name, id), value: record });
      return JSON.parse(record.data);
    }
    return [];
  }
  async getIndexOfAttachments(name, id, filename, fail = false) {
    const attachments = await this.get(name, id);
    const idx = attachments.findIndex((a) => a.name === filename);
    if (idx === -1 && fail)
      throw storageError.attachedFileNotFound(name, id, filename);
    return { attachments, index: idx };
  }
  async destroy(repository, id) {
    for (const collectionsKey in this.collections) {
      await this.destroyFiles(collectionsKey, id);
    }
  }
  async destroyFiles(name, id) {
    this.cache?.del(this.getCacheKey(name, id));
    await this.stmt_del({ name, id });
    const path2 = this.getPath(name, id);
    if (await fileExists(path2)) {
      const files = await fs3.promises.readdir(path2);
      files.map(async (file) => {
        await fs3.promises.unlink(Path2.join(path2, file));
        if (this.cleanup !== undefined)
          await this.cleanup(name, id, file);
      });
      await removeEmptyParentDirectories(path2);
    }
  }
  async updateRecord(name, id, attachments) {
    this.cache?.del(this.getCacheKey(name, id));
    await this.db.update(this.schema).set({ data: JSON.stringify(attachments) }).where(and(eq2(sql4`itemId`, sql4.placeholder("id")), eq2(sql4`name`, sql4.placeholder("name")))).execute({ name, id });
  }
  async add(name, id, file, metadata) {
    let path2 = this.getPath(name, id);
    let filename = Path2.basename(file.filename);
    filename = sanitizeFilename(filename);
    filename = await getUniqueFilename(path2, filename);
    await fs3.promises.mkdir(path2, { recursive: true });
    await fs3.promises.copyFile(file.file, Path2.join(path2, filename));
    let res = { found: false };
    const attachments = await this.get(name, id, res);
    attachments.push({
      name: filename,
      size: (await fs3.promises.stat(file.file)).size,
      id: crypto.randomUUID(),
      metadata
    });
    if (res.found === false) {
      await this.db.insert(this.schema).values({ name, itemId: id, data: JSON.stringify(attachments) }).execute();
    } else {
      await this.db.update(this.schema).set({ data: JSON.stringify(attachments) }).where(and(sql4`name = ${sql4.placeholder("name")}`, sql4`itemId = ${sql4.placeholder("id")}`)).execute({ name, id });
      this.cache?.del(this.getCacheKey(name, id));
    }
    await file.release();
  }
  async delete(name, id, filename) {
    let { attachments, index } = await this.getIndexOfAttachments(name, id, filename, true);
    attachments.splice(index, 1);
    await this.updateRecord(name, id, attachments);
    const path2 = this.getPath(name, id);
    await fs3.promises.unlink(Path2.resolve(path2, filename));
    await removeEmptyParentDirectories(path2);
  }
  async setPosition(name, id, filename, position) {
    const attachments = await this.get(name, id);
    const idx = attachments.findIndex((a) => a.name === filename);
    if (idx === -1)
      throw storageError.attachedFileNotFound(name, id, filename);
    if (idx === position)
      return;
    attachments.splice(position, 0, ...attachments.splice(idx, 1));
    await this.updateRecord(name, id, attachments);
  }
  async updateMetadata(name, id, filename, metadata) {
    const attachments = await this.get(name, id);
    const idx = attachments.findIndex((a) => a.name === filename);
    if (idx === -1)
      throw storageError.attachedFileNotFound(name, id, filename);
    attachments[idx].metadata = { ...attachments[idx].metadata, ...metadata };
    await this.updateRecord(name, id, attachments);
  }
  async rename(name, id, filename, newName) {
    const attachments = await this.get(name, id);
    const idx = attachments.findIndex((a) => a.name === filename);
    if (idx === -1)
      throw storageError.attachedFileNotFound(name, id, filename);
    let path2 = this.getPath(name, id);
    newName = sanitizeFilename(newName);
    newName = await getUniqueFilename(path2, newName);
    attachments[idx].name = newName;
    await fs3.promises.rename(Path2.join(path2, filename), Path2.join(path2, newName));
    await this.updateRecord(name, id, attachments);
  }
  plugin() {
    return (repository) => {
      repository.pipelines.delete.blocks.finalize.prepend(async (state) => this.destroy(repository, state.item.id));
    };
  }
}
__legacyDecorateClassTS([
  MaterializeIt4
], Storage.prototype, "stmt_get", null);
__legacyDecorateClassTS([
  MaterializeIt4
], Storage.prototype, "stmt_all", null);
__legacyDecorateClassTS([
  MaterializeIt4
], Storage.prototype, "stmt_del", null);
// src/extensions/plugin.storage/helper/schema-helpers.ts
import { int as int2, json, mysqlTable, serial, unique, varchar } from "drizzle-orm/mysql-core";
var stormStorageSchemaHelpers = {
  storageSchemaFactory: function(name = "_storage") {
    return mysqlTable(name, {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      itemId: int2("itemId").notNull(),
      data: json("data").default("{}")
    }, (t) => ({
      unq: unique().on(t.name, t.itemId)
    }));
  }
};
// src/extensions/plugin.storage/helper/storage-plugin.ts
function storagePlugin(repository, storage) {
  repository.pipelines.delete.blocks.finalize.append(async (state) => {
    storage.destroy(repository, state.item.id);
  });
}
// src/extensions/plugin.cache/cache-plugin.ts
function cachePlugin(resultCache) {
  return (repository) => {
    repository.pipelines.getOne.blocks.prepare.append(async (state) => state.dto = await resultCache.get(state.id)).finalize.prepend(async (state) => state.dto !== undefined && await resultCache.set(state.dto));
    repository.pipelines.getArray.blocks.prepare.append(async (state) => {
      state.dtos = await resultCache.get(state.ids);
      let dtoIds = state.dtos.map((dto) => dto.id);
      state.ids = state.ids.filter((num) => !dtoIds.includes(num));
    }).finalize.prepend(async (state) => await resultCache.set(state.dtos));
    repository.pipelines.update.blocks.finalize.append(async (state) => await resultCache.del(state.item.id));
    repository.pipelines.delete.blocks.finalize.prepend(async (state) => await resultCache.del(state.item.id));
    repository.pipelines.overwrite.blocks.finalize.append(async (state) => await resultCache.del(state.item.id));
  };
}
// src/extensions/plugin.cache/result-cache-factory.ts
class ResultCache {
  cache;
  constructor(cache) {
    this.cache = cache;
  }
  async set(res) {
    if (Array.isArray(res))
      await this.cache.set(res.map((dto) => {
        return { key: dto.id, value: dto };
      }));
    else
      await this.cache.set({ key: res.id, value: res });
    return res;
  }
  get get() {
    return this.cache.get.bind(this.cache);
  }
  get del() {
    return this.cache.del.bind(this.cache);
  }
  get setter() {
    return this.set.bind(this);
  }
}

class ResultCacheWithMaps extends ResultCache {
  cache;
  mapCache;
  mappedFields;
  constructor(cache, mapCache, mappedFields) {
    super(cache);
    this.cache = cache;
    this.mapCache = mapCache;
    this.mappedFields = mappedFields;
  }
  async set(res) {
    await super.set(res);
    if (Array.isArray(res))
      for (const item of res)
        for (const field of this.mappedFields)
          await this.mapCache.set({ key: `<${field}>:${item[field]}`, value: item.id });
    else
      for (const field of this.mappedFields)
        await this.mapCache.set({ key: `<${field}>:${res[field]}`, value: res.id });
    return res;
  }
}
// src/extensions/plugin.cache/cached-get-by-factory.ts
function cachedGetByFactory(repo, fieldName, resultCache) {
  let getBy = getByFactory(repo, fieldName);
  return async (search) => {
    let key = `<${fieldName}>:${search}`;
    let id = await resultCache.mapCache.get(key);
    if (id) {
      let state = await repo.pipelines.getOne.run(repo, { id });
      if (state.dto[fieldName] === search)
        return state.item;
      await resultCache.mapCache.del(key);
    }
    let res = await getBy.stmt.execute({ search });
    await resultCache.set(res);
    let item = await repo.instantiate.first(res);
    if (item)
      await resultCache.mapCache.set({ key, value: item.id });
    return item;
  };
}
// src/extensions/plugin.sequence/sequence-manager.ts
import { omitFieldsIP as omitFieldsIP3 } from "@laborci/util";
import { and as and2, eq as eq3, gt, gte, sql as sql5 } from "drizzle-orm";

class SequenceManager {
  repo;
  sequenceField;
  parentField;
  constructor(repo, sequenceField, parentField) {
    this.repo = repo;
    this.sequenceField = sequenceField;
    this.parentField = parentField;
    repo.pipelines.update.blocks.action.prepend(async (state) => {
      omitFieldsIP3(state.dto, this.sequenceField, this.parentField);
    });
    repo.pipelines.insert.blocks.prepare.append(async (state) => {
      state.dto[this.sequenceField] = await this.next(state.dto[this.parentField]);
    });
    repo.pipelines.delete.blocks.finalize.append(async (state) => {
      let set = {};
      set[this.sequenceField] = sql5`${this.repo.schema[this.sequenceField]} - 1`;
      await this.repo.db.update(this.repo.schema).set(set).where(and2(eq3(this.repo.schema[this.parentField], state.item[this.parentField]), gt(this.repo.schema[this.sequenceField], state.item[this.sequenceField])));
    });
  }
  async max(parent) {
    let res = await this.repo.db.select({ max: sql5`Max(${this.repo.schema[this.sequenceField]})` }).from(this.repo.schema).where(eq3(this.repo.schema[this.parentField], parent)).execute();
    return res[0].max;
  }
  async next(parent) {
    let r = await this.max(parent).then((r2) => r2 + 1);
    console.log("ASD", r);
    return r;
  }
  async move(entity2, param) {
    let set = {};
    set[this.sequenceField] = sql5`${this.repo.schema[this.sequenceField]} - 1`;
    await this.repo.db.update(this.repo.schema).set(set).where(and2(eq3(this.repo.schema[this.parentField], entity2[this.parentField]), gt(this.repo.schema[this.sequenceField], entity2[this.sequenceField])));
    let values = {};
    if (typeof param === "number" || typeof param === "string") {
      values[this.sequenceField] = await this.next(param);
      values[this.parentField] = param;
      await this.repo.overwrite(entity2, values);
    } else {
      values[this.parentField] = param[this.parentField];
      values[this.sequenceField] = param[this.sequenceField];
      set[this.sequenceField] = sql5`${this.repo.schema[this.sequenceField]} + 1`;
      await this.repo.db.update(this.repo.schema).set(set).where(and2(eq3(this.repo.schema[this.parentField], param[this.parentField]), gte(this.repo.schema[this.sequenceField], param[this.sequenceField])));
      await this.repo.overwrite(entity2, values);
    }
  }
}
// src/extensions/plugin.tag/group-tag-repository.ts
import { MaterializeIt as MaterializeIt6 } from "@laborci/util";
import { and as and4, eq as eq4, not as not2, sql as sql7 } from "drizzle-orm";

// src/extensions/plugin.tag/helper/error.ts
import { err as err3, errorGroup as errorGroup3 } from "@laborci/util";
var tagError = {
  itemNotFound: (repository) => err3("item not found!", { repository }, 404),
  groupId: (details = {}) => err3("Group id was not provided or the given field name is wrong!", details, 500),
  selfRename: () => err3("fieldName wasn't provided for selfRename!", {}, 500),
  groupPrepare: () => err3("Group tag's prepare is not needed", {}, 500)
};
errorGroup3(tagError, "STORM_TAG");

// src/extensions/plugin.tag/tag-repository.ts
import { MaterializeIt as MaterializeIt5 } from "@laborci/util";
import { and as and3, not, sql as sql6 } from "drizzle-orm";
class TagEntity extends Entity {
}
__legacyDecorateClassTS([
  Export,
  Import
], TagEntity.prototype, "name", undefined);

class TagRepository extends EntityRepository {
  usages = [];
  initialize(addPipelines = true) {
    super.initialize();
    if (addPipelines) {
      this.pipelines.delete.blocks.finalize.append(async (state) => await this.deleteInUsages(state.item.name));
      this.pipelines.update.blocks.prepare.append(async (state) => await prevDto(state, this)).finalize.append(async (state) => await this.selfRename(state.dto, state.prevDto));
    }
  }
  get stmt_getByName() {
    return stmt(this.db.select().from(this.schema).where(sql6`name IN (${sql6.placeholder("names")})`), this.instantiate.all);
  }
  async getByName(names) {
    let isArray = Array.isArray(names);
    if (typeof names === "string")
      names = [names];
    if (names.length === 0)
      return isArray ? [] : undefined;
    let tags = await this.stmt_getByName({ names });
    return !isArray ? tags[0] : tags;
  }
  async rename(oldName, newName) {
    oldName = oldName.replace(",", "").trim();
    newName = newName.replace(",", "").trim();
    if (oldName === newName)
      return;
    let o = await this.getByName(oldName);
    if (!o)
      return;
    let n = await this.getByName(newName);
    if (!n) {
      o.name = newName;
      await this.update(o);
    } else {
      await this.delete(o);
    }
    await this.doRename(oldName, newName);
  }
  async deleteInUsages(name) {
    name = name.trim();
    let helper2 = `,${name},`;
    for (let usage of this.usages) {
      let set = {};
      set[usage.field] = sql6`trim(both ',' from replace(concat(',', ${usage.repo.schema[usage.field]} , ','), ${helper2}, ','))`;
      await usage.repo.db.update(usage.repo.schema).set(set).where(sql6`FIND_IN_SET(${name}, ${usage.repo.schema[usage.field]})`);
    }
  }
  addUsage(usage) {
    this.usages.push(...Array.isArray(usage) ? usage : [usage]);
  }
  async selfRename(dto, prevDto2) {
    if (dto.name && dto.name !== prevDto2.name) {
      await this.doRename(prevDto2.name, dto.name);
    }
  }
  async updateTag(repository, dto, prevDto2) {
    let { prev, curr } = this.changes(repository, dto, prevDto2);
    await this.addTag(curr.filter((x) => !prev.includes(x)));
    await this.deleteTag(prev.filter((x) => !curr.includes(x)));
  }
  prepare(repository, dto) {
    for (let usage of this.usages) {
      if (usage.repo === repository) {
        if (!dto[usage.field])
          dto[usage.field] = "";
        dto[usage.field] = [...new Set(dto[usage.field].trim().split(",").map((x) => x.trim()).filter((x) => !!x))].join(",");
      }
    }
  }
  changes(repository, dto, prevDto2) {
    if (!prevDto2)
      throw tagError.itemNotFound(repository.constructor.name);
    let prev = [];
    let curr = [];
    for (let usage of this.usages) {
      if (usage.repo === repository) {
        prev.push(...prevDto2[usage.field] ? prevDto2[usage.field].split(",") : []);
        curr.push(...dto[usage.field] ? dto[usage.field].split(",") : []);
      }
    }
    prev = [...new Set(prev)];
    curr = [...new Set(curr)];
    return { prev, curr };
  }
  async deleteTag(names) {
    let items = await this.getByName(names);
    if (items.length === 0)
      return;
    await this.deleteItems(items);
  }
  async deleteItems(items) {
    for (let item of items) {
      let usageFound = false;
      for (let usage of this.usages) {
        let res = await usage.repo.db.select().from(usage.repo.schema).where(sql6`FIND_IN_SET(${item.name}, ${usage.repo.schema[usage.field]})`).limit(1).execute();
        if (res.length !== 0) {
          usageFound = true;
          break;
        }
      }
      if (!usageFound)
        await this.delete(item);
    }
  }
  async addTag(names) {
    let items = await this.getByName(names).then((r) => r.map((i) => i.name));
    let toAdd = names.filter((x) => !items.includes(x));
    for (let tag of toAdd) {
      let item = await this.create();
      item.name = tag;
      await this.insert(item);
    }
  }
  async doRename(oldName, newName) {
    for (let usage of this.usages) {
      let set = {};
      set[usage.field] = sql6`trim(both ',' from replace(concat(',', ${usage.field} , ','), ',${oldName},', ',${newName},'))`;
      await usage.repo.db.update(usage.repo.schema).set(set).where(and3(sql6`FIND_IN_SET("${oldName}", ${usage.field})`, not(sql6`FIND_IN_SET("${newName}", ${usage.field})`)));
      set[usage.field] = sql6`trim(both ',' from replace(concat(',', ${usage.field} , ','), ',${oldName},', ','))`;
      await usage.repo.db.update(usage.repo.schema).set(set).where(and3(sql6`FIND_IN_SET("${oldName}", ${usage.field})`, sql6`FIND_IN_SET("${newName}", ${usage.field})`));
    }
  }
  plugin(field) {
    return (repository) => {
      let usage = { repo: repository, field };
      this.addUsage(usage);
      repository.pipelines.update.blocks.prepare.append(async (state) => {
        await prevDto(state, repository);
        this.prepare(repository, state.dto);
      }).finalize.append(async (state) => {
        await this.selfRename(state.dto, state.prevDto);
        await this.updateTag(repository, state.dto, state.prevDto);
      });
      repository.pipelines.delete.blocks.prepare.append(async (state) => await prevDto(state, repository)).finalize.append(async (state) => await this.deleteTag(state.prevDto[usage.field].split(",")));
      repository.pipelines.insert.blocks.prepare.append(async (state) => this.prepare(repository, state.dto));
      repository.pipelines.overwrite.blocks.prepare.append(async (state) => await prevDto(state, repository)).finalize.append(async (state) => {
        await this.selfRename(state.dto, await prevDto(state, repository));
        await this.updateTag(repository, state.dto, await prevDto(state, repository));
      });
    };
  }
}
__legacyDecorateClassTS([
  MaterializeIt5
], TagRepository.prototype, "stmt_getByName", null);

// src/extensions/plugin.tag/group-tag-repository.ts
class GroupTagEntity extends TagEntity {
}
__legacyDecorateClassTS([
  Export,
  Import
], GroupTagEntity.prototype, "groupId", undefined);

class GroupTagRepository extends TagRepository {
  db;
  schema;
  entity2;
  usages = [];
  constructor(db, schema, entity2) {
    super(db, schema, entity2);
    this.db = db;
    this.schema = schema;
    this.entity = entity2;
  }
  initialize() {
    super.initialize(false);
    this.pipelines.delete.blocks.finalize.append(async (state) => await this.deleteInUsages(state.item.name, state.item.groupId));
    this.pipelines.update.blocks.prepare.append(async (state) => await prevDto(state, this)).finalize.append(async (state) => await this.selfRename(state.dto, state.prevDto));
  }
  get stmt_groupGetByName() {
    return stmt(this.db.select().from(this.schema).where(sql7`name IN (${sql7.placeholder("names")}) AND groupId = ${sql7.placeholder("groupId")}`), this.instantiate.all);
  }
  get stmt_getByGroup() {
    return stmt(this.db.select().from(this.schema).where(sql7`groupId = ${sql7.placeholder("groupId")}`), this.instantiate.all);
  }
  async getToGroup(groupId) {
    return this.stmt_getByGroup({ groupId });
  }
  async getByName(names, groupId) {
    if (!groupId)
      throw tagError.groupId({ where: "GETBYNAME", groupId });
    let isArray = Array.isArray(names);
    if (typeof names === "string")
      names = [names];
    if (names.length === 0)
      return isArray ? [] : undefined;
    let tags = await this.stmt_groupGetByName({ names, groupId });
    return !isArray ? tags[0] : tags;
  }
  async deleteInUsages(name, groupId) {
    if (!groupId)
      throw tagError.groupId({ where: "DELETE IN USAGES", groupId });
    name = name.trim();
    let listNameHelper = `,${name},`;
    let jsonNameHelper = `\$.${name}`;
    for (let usage of this.usages) {
      let set = {};
      if (usage.mode === "LIST") {
        set[usage.field] = sql7`trim(both ',' from replace(concat(',', ${usage.repo.schema[usage.field]} , ','), ${listNameHelper}, ','))`;
        await usage.repo.db.update(usage.repo.schema).set(set).where(and4(sql7`FIND_IN_SET(${name}, ${usage.repo.schema[usage.field]})`, eq4(usage.repo.schema[usage.groupField], groupId)));
      } else {
        set[usage.field] = sql7`JSON_REMOVE(${usage.repo.schema[usage.field]}, ${jsonNameHelper})`;
        await usage.repo.db.update(usage.repo.schema).set(set).where(and4(sql7`JSON_EXTRACT(${usage.repo.schema[usage.field]}, ${jsonNameHelper}) IS NOT NULL`, eq4(usage.repo.schema[usage.groupField], groupId)));
      }
    }
  }
  async rename(oldName, newName, groupId) {
    oldName = oldName.replace(",", "").trim();
    newName = newName.replace(",", "").trim();
    if (oldName === newName)
      return;
    let oldItem = await this.getByName(oldName, groupId);
    if (!oldItem)
      return;
    let newItem = await this.getByName(newName, groupId);
    let item = Array.isArray(oldItem) ? oldItem[0] : oldItem;
    if (!newItem) {
      item.name = newName;
      await this.update(item);
    } else
      await this.delete(item);
    await this.doRename(oldName, newName, groupId);
  }
  async updateTag(repository, item, prevDto2, fieldName) {
    if (!fieldName)
      throw tagError.selfRename();
    let groupId = item[fieldName];
    if (!groupId)
      throw tagError.groupId({ where: "UPDATE TAG", groupId });
    let { prev, curr } = this.changes(repository, item, prevDto2);
    await this.addTag(curr.filter((x) => !prev.includes(x)), groupId);
    await this.deleteTag(prev.filter((x) => !curr.includes(x)), groupId);
  }
  changes(repository, item, prevDto2) {
    if (!prevDto2)
      throw tagError.itemNotFound(repository.constructor.name);
    let curr = [];
    let prev = [];
    for (let usage of this.usages) {
      if (usage.repo === repository) {
        if (usage.mode === "JSON") {
          prev.push(...Object.keys(prevDto2[usage.field]));
          curr.push(...Object.keys(item[usage.field]));
        } else {
          prev.push(...prevDto2[usage.field] ? prevDto2[usage.field].split(",") : []);
          curr.push(...item[usage.field] ? item[usage.field].split(",") : []);
        }
      }
    }
    prev = [...new Set(prev)];
    curr = [...new Set(curr)];
    return { prev, curr };
  }
  async selfRename(dto, prevDto2) {
    if (dto.name && dto.name !== prevDto2.name)
      await this.doRename(prevDto2.name, dto.name, dto.groupId);
  }
  async addTag(names, groupId) {
    if (!groupId)
      throw tagError.groupId({ where: "ADD TAG", groupId });
    let items = await this.getByName(names, groupId).then((r) => r.map((i) => i.name));
    let toAdd = names.filter((x) => !items.includes(x));
    for (let tag of toAdd) {
      let item = await this.create({ groupId, name: tag });
      await this.insert(item);
    }
  }
  async deleteTag(names, groupId) {
    if (!groupId)
      throw tagError.groupId({ where: "DELETE TAG", groupId });
    let items = await this.getByName(names, groupId);
    if (items.length === 0)
      return;
    await this.deleteItems(items, groupId);
  }
  async deleteItems(items, groupId) {
    for (let item of items) {
      let doDelete = true;
      for (let usage of this.usages) {
        let res = await usage.repo.db.select().from(usage.repo.schema).where(and4(sql7`FIND_IN_SET(${item.name}, ${usage.repo.schema[usage.field]})`, eq4(usage.repo.schema[usage.groupField], groupId))).limit(1).execute();
        if (res.length !== 0) {
          doDelete = false;
          break;
        }
      }
      if (doDelete) {
        await this.delete(item);
      }
    }
  }
  async doRename(oldName, newName, groupId) {
    if (!groupId)
      throw tagError.groupId({ where: "DO RENAME", groupId });
    let nN = `\$.${newName}`;
    let oN = `\$.${oldName}`;
    let eN = `"${newName}"`;
    let eO = `"${oldName}"`;
    let oldN = `,${oldName},`;
    let newN = `,${newName},`;
    for (let usage of this.usages) {
      let set = {};
      if (usage.mode && usage.mode === "JSON") {
        let w = and4(sql7`json_extract(${usage.repo.schema[usage.field]}, ${oN}) > 0`, sql7`json_extract(${usage.repo.schema[usage.field]}, ${nN}) is NULL`, eq4(usage.repo.schema[usage.groupField], groupId));
        set[usage.field] = sql7`replace(${usage.repo.schema[usage.field]}, ${eO}, ${eN})`;
        await usage.repo.db.update(usage.repo.schema).set(set).where(w);
        w = and4(sql7`json_extract(${usage.repo.schema[usage.field]}, ${oN}) > 0`, sql7`json_extract(${usage.repo.schema[usage.field]}, ${nN}) > 0`);
        set[usage.field] = sql7`json_remove(${usage.repo.schema[usage.field]}, ${oN})`;
        await usage.repo.db.update(usage.repo.schema).set(set).where(w);
      } else {
        set[usage.field] = sql7`trim(both ',' from replace(concat(',', ${usage.repo.schema[usage.field]} , ','), ${oldN}, ${newN}))`;
        await usage.repo.db.update(usage.repo.schema).set(set).where(and4(sql7`FIND_IN_SET(${oldName}, ${usage.repo.schema[usage.field]})`, not2(sql7`FIND_IN_SET(${newName}, ${usage.repo.schema[usage.field]})`), eq4(usage.repo.schema[usage.groupField], groupId)));
        set[usage.field] = sql7`trim(both ',' from replace(concat(',', ${usage.repo.schema[usage.field]} , ','), ${oldN}, ','))`;
        await usage.repo.db.update(usage.repo.schema).set(set).where(and4(sql7`FIND_IN_SET(${oldName}, ${usage.repo.schema[usage.field]})`, sql7`FIND_IN_SET(${newName}, ${usage.repo.schema[usage.field]})`, eq4(usage.repo.schema[usage.groupField], groupId)));
      }
    }
  }
  prepare(repository, dto) {
    for (let usage of this.usages) {
      if (usage.repo === repository && usage.mode === "LIST") {
        dto[usage.field] = [...new Set((dto[usage.field] || "").trim().split(",").map((x) => x.trim()).filter((x) => !!x))].join(",");
      }
    }
  }
  plugin(field, groupField, mode = "LIST") {
    if (!groupField)
      throw new Error("GROUPID MUST BE DEFINED !!!!!!!");
    return (repository) => {
      let usage = { repo: repository, field, groupField, mode };
      this.addUsage(usage);
      repository.pipelines.update.blocks.prepare.append(async (state) => await prevDto(state, repository)).prepare.append(async (state) => this.prepare(repository, state.dto)).finalize.append(async (state) => {
        await this.updateTag(repository, state.item, state.prevDto, groupField);
      });
      repository.pipelines.delete.blocks.prepare.append(async (state) => await prevDto(state, repository)).finalize.append(async (state) => {
        await this.deleteTag(state.prevDto[usage.field].split(","), state.prevDto[groupField]);
      });
      repository.pipelines.insert.blocks.prepare.append(async (state) => this.prepare(repository, state.dto));
      repository.pipelines.overwrite.blocks.prepare.append(async (state) => await prevDto(state, repository)).finalize.append(async (state) => {
        await this.updateTag(repository, state.item, await prevDto(state, repository), groupField);
      });
    };
  }
}
__legacyDecorateClassTS([
  MaterializeIt6
], GroupTagRepository.prototype, "stmt_groupGetByName", null);
__legacyDecorateClassTS([
  MaterializeIt6
], GroupTagRepository.prototype, "stmt_getByGroup", null);
// src/extensions/plugin.tag/helper/schema-helpers.ts
import { int as int3, mysqlTable as mysqlTable2, varchar as varchar2 } from "drizzle-orm/mysql-core";
var stormTagSchemaHelpers = {
  tagTableFactory: function(name, id) {
    let columns = this.tagCols(id);
    return mysqlTable2(name, columns);
  },
  groupTagTableFactory: function(name, id, groupColReference) {
    let columns = this.groupTagCols(id, groupColReference);
    return mysqlTable2(name, columns);
  },
  tagCols: function(id) {
    return { id: id(), name: varchar2("name", { length: 255 }).notNull().unique() };
  },
  groupTagCols: function(id, groupColReference) {
    return { id: id(), name: varchar2("name", { length: 255 }).notNull(), groupId: int3("groupId").references(groupColReference) };
  }
};
// src/extensions/plugin.validator/validator.ts
function validatorPlugin(insert, update) {
  return (repository) => {
    repository.pipelines.insert.blocks.prepare.append(async (state) => {
      insert.parse(state.dto);
    });
    repository.pipelines.update.blocks.prepare.append(async (state) => {
      (update ?? insert).parse(state.dto);
    });
  };
}
export {
  validatorPlugin,
  tagError,
  stormTagSchemaHelpers,
  stormStorageSchemaHelpers,
  stormSqlHelpers,
  stormSchemaHelpers,
  storagePlugin,
  storageError,
  stmt,
  prevDto,
  likeString,
  getByFactory,
  getAllByFactory,
  entityError,
  cachedGetByFactory,
  cachePlugin,
  ViewEntityRepository,
  ViewEntity,
  TagRepository,
  TagEntity,
  Storage,
  SequenceManager,
  ResultCacheWithMaps,
  ResultCache,
  In,
  Import,
  GroupTagRepository,
  GroupTagEntity,
  Export,
  EntityRepository,
  Entity,
  CollectionHandler,
  Collection,
  Attachment
};
