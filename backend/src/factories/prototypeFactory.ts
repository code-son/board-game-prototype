import { Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import PrototypeModel from '../models/Prototype';
import { PROTOTYPE_TYPE, PROTOTYPE_VERSION } from '../const';
import PrototypeVersionModel from '../models/PrototypeVersion';
import PlayerModel from '../models/Player';
import PrototypeGroupModel from '../models/PrototypeGroup';
import AccessModel from '../models/Access';
import UserAccessModel from '../models/UserAccess';
import PartModel from '../models/Part';

/**
 * プロトタイプを作成する(プロトタイプバージョン、プレイヤーも作成する)
 *
 * @param userId - ユーザーID
 * @param name - プロトタイプ名
 * @param type - プロトタイプタイプ
 * @param groupId - グループID
 * @param masterPrototypeId - マスタープロトタイプID
 * @param minPlayers - 最小プレイヤー数
 * @param maxPlayers - 最大プレイヤー数
 * @param transaction - トランザクション
 * @returns 作成したプロトタイプ
 */
export async function createPrototype({
  userId,
  name,
  type,
  editPrototypeDefaultVersionId,
  groupId,
  minPlayers,
  maxPlayers,
  transaction,
}: {
  userId: string;
  name: string;
  type: typeof PROTOTYPE_TYPE.EDIT | typeof PROTOTYPE_TYPE.PREVIEW;
  editPrototypeDefaultVersionId: string | null;
  groupId: string | null;
  minPlayers: number;
  maxPlayers: number;
  transaction: Transaction;
}) {
  const prototypeGroupId = groupId ?? uuidv4();

  // プロトタイプ作成
  const newPrototype = await PrototypeModel.create(
    {
      userId,
      name,
      type,
      groupId: prototypeGroupId,
      masterPrototypeId: null,
      minPlayers,
      maxPlayers,
    },
    { transaction }
  );

  // 初期バージョン作成
  const newPrototypeVersion = await PrototypeVersionModel.create(
    {
      prototypeId: newPrototype.id,
      versionNumber: PROTOTYPE_VERSION.INITIAL,
      description: '初期バージョン',
    },
    { transaction }
  );

  // 初期バージョンのプレイヤー作成
  const players = await PlayerModel.findAll({
    where: {
      prototypeVersionId: editPrototypeDefaultVersionId,
    },
  });
  let newPlayers = null;
  if (players.length === 0) {
    // 編集版の場合は、プレイヤーを新規作成
    newPlayers = await PlayerModel.bulkCreate(
      Array.from({ length: maxPlayers }).map((_, i) => ({
        prototypeVersionId: newPrototypeVersion.id,
        userId: null,
        playerName: `プレイヤー${i + 1}`,
      })),
      { transaction, returning: true }
    );
  } else {
    // プレビュー版の場合は、プレイヤーを複製
    newPlayers = await PlayerModel.bulkCreate(
      players.map((player) => ({
        prototypeVersionId: newPrototypeVersion.id,
        userId: null,
        playerName: player.playerName,
        originalPlayerId: player.id,
      })),
      { transaction, returning: true }
    );
  }

  // プロトタイプグループの追加
  PrototypeGroupModel.create(
    {
      id: prototypeGroupId,
      prototypeId: newPrototype.id,
    },
    { transaction }
  );

  // 編集用の場合は、アクセス権を作成する
  if (type === PROTOTYPE_TYPE.EDIT) {
    const access = await AccessModel.create(
      {
        prototypeGroupId: prototypeGroupId,
        name: `グループ#${prototypeGroupId}のアクセス権`,
      },
      { transaction }
    );
    await UserAccessModel.create(
      {
        userId,
        accessId: access.id,
      },
      { transaction }
    );
  }

  if (type === PROTOTYPE_TYPE.PREVIEW) {
    // パーツの複製
    const editParts = await PartModel.findAll({
      where: {
        prototypeVersionId: editPrototypeDefaultVersionId,
      },
    });

    const newParts = await PartModel.bulkCreate(
      editParts.map((part) => ({
        type: part.type,
        prototypeVersionId: newPrototypeVersion.id,
        parentId: null,
        name: part.name,
        description: part.description,
        color: part.color,
        position: part.position,
        width: part.width,
        height: part.height,
        order: part.order,
        configurableTypeAsChild: part.configurableTypeAsChild,
        isReversible: part.isReversible,
        isFlipped: part.isFlipped,
        ownerId: null,
        canReverseCardOnDeck: part.canReverseCardOnDeck,
        originalPartId: part.id,
      })),
      { transaction, returning: true }
    );

    // 親パーツがあるパーツを更新する
    const editPartsWithParent = editParts.filter(
      (part) => part.parentId !== null
    );
    await Promise.all(
      editPartsWithParent.map(async (part) => {
        const newParentPart = newParts.find(
          (newPart) => newPart.originalPartId === part.parentId
        );

        if (!newParentPart) return null;
        return PartModel.update(
          { parentId: newParentPart.id },
          { where: { originalPartId: part.id }, transaction }
        );
      })
    );

    // オーナーを設定する
    const editPartsWithOwner = editParts.filter(
      (part) => part.ownerId !== null
    );
    await Promise.all(
      editPartsWithOwner.map(async (part) => {
        const newOwner = newPlayers.find(
          (player) => player.originalPlayerId === part.ownerId
        );

        if (!newOwner) return null;
        return PartModel.update(
          { ownerId: newOwner.id },
          { where: { originalPartId: part.id }, transaction }
        );
      })
    );
  }

  return newPrototype;
}

export const createPrototypeVersion = async (
  originalPrototypeVersion: PrototypeVersionModel,
  newVersionNumber: string,
  description: string,
  transaction: Transaction
) => {
  const newPrototypeVersion = await PrototypeVersionModel.create(
    {
      prototypeId: originalPrototypeVersion.prototypeId,
      versionNumber: newVersionNumber,
      description,
    },
    { transaction }
  );

  const prototype = await PrototypeModel.findByPk(
    originalPrototypeVersion.prototypeId
  );
  if (!prototype) {
    throw new Error('プロトタイプが見つかりません');
  }

  // プレイヤー作成
  const players = await PlayerModel.findAll({
    where: {
      prototypeVersionId: originalPrototypeVersion.id,
    },
  });
  const newPlayers = await PlayerModel.bulkCreate(
    players.map((player) => ({
      prototypeVersionId: newPrototypeVersion.id,
      userId: null,
      playerName: player.playerName,
      originalPlayerId: player.id,
    })),
    { transaction, returning: true }
  );

  // パーツの複製
  const originalParts = await PartModel.findAll({
    where: {
      prototypeVersionId: originalPrototypeVersion.id,
    },
  });
  const newParts = await PartModel.bulkCreate(
    originalParts.map((part) => ({
      type: part.type,
      prototypeVersionId: newPrototypeVersion.id,
      parentId: null,
      name: part.name,
      description: part.description,
      color: part.color,
      position: part.position,
      width: part.width,
      height: part.height,
      order: part.order,
      configurableTypeAsChild: part.configurableTypeAsChild,
      isReversible: part.isReversible,
      isFlipped: part.isFlipped,
      ownerId: null,
      canReverseCardOnDeck: part.canReverseCardOnDeck,
      originalPartId: part.id,
    })),
    { transaction, returning: true }
  );

  // 親パーツがあるパーツを更新する
  const originalPartsWithParent = originalParts.filter(
    (part) => part.parentId !== null
  );
  await Promise.all(
    originalPartsWithParent.map(async (part) => {
      const newParentPart = newParts.find(
        (newPart) => newPart.originalPartId === part.parentId
      );

      if (!newParentPart) return null;
      return PartModel.update(
        { parentId: newParentPart.id },
        { where: { originalPartId: part.id }, transaction }
      );
    })
  );

  // オーナーを設定する
  const originalPartsWithOwner = originalParts.filter(
    (part) => part.ownerId !== null
  );
  await Promise.all(
    originalPartsWithOwner.map(async (part) => {
      const newOwner = newPlayers.find(
        (player) => player.originalPlayerId === part.ownerId
      );

      if (!newOwner) return null;
      return PartModel.update(
        { ownerId: newOwner.id },
        { where: { originalPartId: part.id }, transaction }
      );
    })
  );
};
