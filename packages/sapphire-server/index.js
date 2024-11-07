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
var __legacyDecorateParamTS = (index, decorator) => (target, key) => decorator(target, key, index);

// packages/sapphire-server/src/error.ts
import { err, errorGroup } from "@nano-forge/util";
var sapphireError = {
  notFound: (details = {}) => err("Not Found", details, 404),
  unauthorized: () => err("Unauthorized", {}, 401),
  forbidden: () => err("Forbidden", {}, 403),
  collectionNotExist: (name) => err("Collection does not exist!", { name }, 404),
  fileNotProvided: () => err("File is not provided", undefined, 400)
};
errorGroup(sapphireError, "SAPPHIRE");
// packages/sapphire-server/src/item-adapter.ts
import { getTableName } from "drizzle-orm";
class ItemAdapter {
  schema;
  repository;
  type;
  constructor(schema, repository) {
    this.schema = schema;
    this.repository = repository;
    this.type = getTableName(this.schema);
  }
  async get(id, preset, env) {
    let u = await this.repository.get(id);
    if (!u)
      throw sapphireError.notFound({ location: "getItem", id });
    return id ? await this.export(u, preset, env) : await this.new(preset, env);
  }
  async save(id, values = {}, env) {
    values = await this.import(id, values, env);
    let item;
    if (!id)
      item = await this.repository.create();
    else
      item = await this.repository.get(id);
    if (!item)
      throw sapphireError.notFound({ location: "saveItem", id });
    item.$import(values);
    await item.$save();
    return item.id;
  }
  async delete(id, env) {
    await this.repository.delete(await this.repository.get(id));
    return true;
  }
  async import(id, values, env) {
    for (let key of Object.keys(this.schema)) {
      let field = this.schema[key];
      if (field.dataType === "date")
        values[key] = values[key] ? new Date(values[key]) : null;
    }
    return values;
  }
  async export(item, preset, env) {
    let data = item ? item.$export() : {};
    if (preset)
      data = { ...data, ...preset };
    return { type: item?.constructor.name, data };
  }
  async new(preset, env) {
    let item = await this.repository.create();
    return this.export(item, preset, env);
  }
}
// packages/sapphire-server/src/list-adapter.ts
import { likeString } from "@nano-forge/storm";
import { and, asc, desc, getTableName as getTableName2, or, sql } from "drizzle-orm";
import { MySqlColumn } from "drizzle-orm/mysql-core";

class JoinedQuickSearch {
  table;
  field;
  connection;
  constructor(table, field, connection) {
    this.table = table;
    this.field = field;
    this.connection = connection;
  }
}

class ListAdapter {
  schema;
  db;
  quickSearchFields;
  sorting;
  constructor(schema, db, quickSearchFields, sorting = {}) {
    this.schema = schema;
    this.db = db;
    this.quickSearchFields = quickSearchFields;
    this.sorting = sorting;
  }
  async get(page, pageSize, quickSearch, order, search, env) {
    let where = await this.where(quickSearch, search, env);
    let select = this.select(where);
    select = this.orderBy(select, order);
    let count = await this.count(where);
    let pageIndex = this.calcPageIndex(page, pageSize, count);
    if (pageSize)
      select = this.pagination(select, pageIndex, pageSize);
    const res = await select.execute();
    let items = [];
    for (let item of res)
      items.push({
        data: await this.export(item),
        type: getTableName2(this.schema)
      });
    return { items, page: pageIndex, count };
  }
  export(item) {
    return item;
  }
  get orders() {
    return this.sorting;
  }
  async filter(env) {
    return;
  }
  async search(search, env) {
    return;
  }
  async quickSearch(search) {
    if (typeof search === "undefined" || search.trim().length === 0)
      return or();
    let likes = [];
    for (let col of Array.isArray(this.quickSearchFields) ? this.quickSearchFields : [this.quickSearchFields]) {
      if (col instanceof MySqlColumn) {
        likes.push(sql`LOWER(${col}) like LOWER(${likeString.contains(search)})`);
      } else {
        if (Array.isArray(col.field))
          for (let f of col.field)
            likes.push(sql`LOWER(${col.table[f]}) like LOWER(${likeString.contains(search)})`);
        else
          likes.push(sql`LOWER(${col.table[col.field]}) like LOWER(${likeString.contains(search)})`);
      }
    }
    return or(...likes);
  }
  orderBy(base, name) {
    if (!name)
      name = Object.keys(this.orders)[0];
    if (Object.keys(this.orders).length === 0 || !Object.keys(this.orders).includes(name))
      return base;
    let orderSQL = [];
    for (let order of this.orders[name])
      orderSQL.push(order.reverse ? desc(order.by) : asc(order.by));
    return base.orderBy(...orderSQL);
  }
  select(where, count = false) {
    let selectBuilder = count ? this.db.select({ amount: sql`count('*')` }) : this.db.select();
    let select = selectBuilder.from(this.schema);
    let joinedS;
    for (let j of this.joinQuickSearch())
      joinedS = (joinedS || select).innerJoin(j.table, j.connection);
    return (joinedS || select).where(where);
  }
  joinQuickSearch() {
    let r = [];
    if (this.quickSearchFields) {
      (Array.isArray(this.quickSearchFields) ? this.quickSearchFields : [this.quickSearchFields]).forEach((i) => {
        if (i instanceof JoinedQuickSearch && !r.includes({ table: i.table, connection: i.connection })) {
          r.push({ table: i.table, connection: i.connection });
        }
      });
    }
    return r;
  }
  pagination(base, pageIndex, pageSize) {
    return base.limit(pageSize).offset(pageIndex * pageSize);
  }
  async where(quickSearch, search, env) {
    const where = [
      await this.filter(env),
      await this.search(search, env),
      await this.quickSearch(quickSearch)
    ].filter((filters) => !!filters);
    return and(...where);
  }
  calcPageIndex(pageIndex, pageSize, count) {
    if (pageIndex < 0 || !pageSize)
      return 0;
    let max = Math.floor(count / pageSize);
    return pageIndex <= max ? pageIndex : max;
  }
  async count(where) {
    return (await this.select(where, true).execute())[0].amount;
  }
}
// packages/sapphire-server/src/sapphire-api.ts
import { Cmd } from "@nano-forge/comet";
class SapphireApi {
  itemAdapter;
  listAdapter;
  storageAdapter;
  constructor(itemAdapter, listAdapter, storageAdapter) {
    this.itemAdapter = itemAdapter;
    this.listAdapter = listAdapter;
    this.storageAdapter = storageAdapter;
  }
  async list_get(args, env) {
    if (!this.listAdapter)
      throw sapphireError.forbidden();
    return this.listAdapter.get(args.page, args.pageSize, args.quickSearch, args.order, args.search, env);
  }
  async item_get(args, env) {
    if (!this.itemAdapter)
      throw sapphireError.forbidden();
    return this.itemAdapter.get(args.id ? parseInt(args.id) : null, args.preset, env);
  }
  async item_save(args, env) {
    if (!this.itemAdapter)
      throw sapphireError.forbidden();
    return this.itemAdapter.save(args.id, args.values, env);
  }
  async item_delete(args, env) {
    if (!this.itemAdapter)
      throw sapphireError.forbidden();
    return await this.itemAdapter.delete(args.id, env);
  }
  async attachment_get(args, env) {
    if (!this.storageAdapter)
      throw sapphireError.forbidden();
    return this.storageAdapter.get(parseInt(args.id), env);
  }
  async attachment_upload(args, { files }, env) {
    if (!this.storageAdapter)
      throw sapphireError.forbidden();
    if (!files)
      throw "File not found";
    return this.storageAdapter.upload(parseInt(args.id), args.collectionName, await Promise.all(files.map((f) => this.storageAdapter.tmpFileFactory.createFromFile(f))));
  }
  async attachment_delete(args, env) {
    if (!this.storageAdapter)
      throw sapphireError.forbidden();
    return this.storageAdapter.delete(parseInt(args.id), args.collectionName, args.fileName);
  }
  async attachment_updateFileData(args, env) {
    if (!this.storageAdapter)
      throw sapphireError.forbidden();
    return this.storageAdapter.updateFileData(parseInt(args.id), args.collectionName, args.fileName, args.newMetaData, args.newName);
  }
  async attachment_changeFilePosition(args, env) {
    if (!this.storageAdapter)
      throw sapphireError.forbidden();
    return this.storageAdapter.changeFilePosition(parseInt(args.id), args.collectionName, args.fileName, parseInt(args.position));
  }
}
__legacyDecorateClassTS([
  Cmd("list.get"),
  __legacyDecorateParamTS(0, Cmd.Arg),
  __legacyDecorateParamTS(1, Cmd.Env)
], SapphireApi.prototype, "list_get", null);
__legacyDecorateClassTS([
  Cmd("item.get"),
  __legacyDecorateParamTS(0, Cmd.Arg),
  __legacyDecorateParamTS(1, Cmd.Env)
], SapphireApi.prototype, "item_get", null);
__legacyDecorateClassTS([
  Cmd("item.save"),
  __legacyDecorateParamTS(0, Cmd.Arg),
  __legacyDecorateParamTS(1, Cmd.Env)
], SapphireApi.prototype, "item_save", null);
__legacyDecorateClassTS([
  Cmd("item.delete"),
  __legacyDecorateParamTS(0, Cmd.Arg),
  __legacyDecorateParamTS(1, Cmd.Env)
], SapphireApi.prototype, "item_delete", null);
__legacyDecorateClassTS([
  Cmd("attachment.get"),
  __legacyDecorateParamTS(0, Cmd.Arg),
  __legacyDecorateParamTS(1, Cmd.Env)
], SapphireApi.prototype, "attachment_get", null);
__legacyDecorateClassTS([
  Cmd("attachment.upload"),
  __legacyDecorateParamTS(0, Cmd.Arg),
  __legacyDecorateParamTS(1, Cmd.File),
  __legacyDecorateParamTS(2, Cmd.Env)
], SapphireApi.prototype, "attachment_upload", null);
__legacyDecorateClassTS([
  Cmd("attachment.delete"),
  __legacyDecorateParamTS(0, Cmd.Arg),
  __legacyDecorateParamTS(1, Cmd.Env)
], SapphireApi.prototype, "attachment_delete", null);
__legacyDecorateClassTS([
  Cmd("attachment.update-file-data"),
  __legacyDecorateParamTS(0, Cmd.Arg),
  __legacyDecorateParamTS(1, Cmd.Env)
], SapphireApi.prototype, "attachment_updateFileData", null);
__legacyDecorateClassTS([
  Cmd("attachment.change-file-position"),
  __legacyDecorateParamTS(0, Cmd.Arg),
  __legacyDecorateParamTS(1, Cmd.Env)
], SapphireApi.prototype, "attachment_changeFilePosition", null);
// packages/sapphire-server/src/storage-adapter.ts
import { getTableName as getTableName3 } from "drizzle-orm";
class StorageAdapter {
  schema;
  repository;
  storage;
  tmpFileFactory;
  allowedCollections;
  type;
  constructor(schema, repository, storage, tmpFileFactory, allowedCollections) {
    this.schema = schema;
    this.repository = repository;
    this.storage = storage;
    this.tmpFileFactory = tmpFileFactory;
    this.allowedCollections = allowedCollections;
    this.type = getTableName3(this.schema);
  }
  async get(id, env) {
    let collectionNames = this.getAllowedCollections(env);
    let collections = [];
    for (let key in this.storage.groups) {
      let group = this.storage.groups[key];
      if (group.repository === this.repository) {
        for (let key2 in group.collections) {
          let collection = group.collections[key2];
          if (collectionNames === undefined || collectionNames.includes(collection.name)) {
            let files = await collection.get(id);
            collections.push({
              id,
              collection: collection.name,
              files,
              rules: collection.rules
            });
          }
        }
      }
    }
    return collections;
  }
  async upload(id, collectionName, files) {
    let item = await this.repository.get(id);
    let collection = this.storage.collections[collectionName];
    if (!collection)
      throw sapphireError.collectionNotExist(collectionName);
    if (files)
      for (let file of files)
        await collection.handler(item)?.add(file);
    else
      throw sapphireError.fileNotProvided();
    return true;
  }
  async delete(id, collectionName, fileName) {
    let file = await this.findFile(id, collectionName, fileName);
    await file.delete();
    return true;
  }
  async updateFileData(id, collectionName, fileName, newMetaData, newName) {
    let collection = this.storage.collections[collectionName];
    if (!collection)
      throw sapphireError.collectionNotExist(collectionName);
    let file = await this.findFile(id, collectionName, fileName);
    if (newMetaData) {
      Object.keys(newMetaData).forEach((key) => file.metadata[key] = newMetaData[key]);
      await file.saveMetaData();
    }
    if (newName && newName.trim() !== fileName.trim())
      await file.rename(newName);
    return true;
  }
  async changeFilePosition(id, collectionName, fileName, position) {
    let file = await this.findFile(id, collectionName, fileName);
    await file.setPositions(position);
    return true;
  }
  getAllowedCollections(env) {
    return this.allowedCollections;
  }
  async findFile(id, collectionName, fileName) {
    let collection = this.storage.collections[collectionName];
    if (!collection)
      throw sapphireError.collectionNotExist(collectionName);
    let item = await this.repository.get(id);
    let handler = collection.handler(item);
    if (!handler)
      throw sapphireError.notFound({ type: "handler" });
    await handler.load();
    let file = handler.findFile(fileName);
    if (!file)
      throw sapphireError.notFound({ type: "file" });
    return file;
  }
}
export {
  sapphireError,
  StorageAdapter,
  SapphireApi,
  ListAdapter,
  JoinedQuickSearch,
  ItemAdapter
};
