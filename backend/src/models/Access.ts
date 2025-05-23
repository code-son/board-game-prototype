import { Model, DataTypes } from 'sequelize';
import sequelize from './index';
import PrototypeGroupModel from './PrototypeGroup';

class AccessModel extends Model {
  // ID
  public id!: number;
  // プロトタイプグループID
  public prototypeGroupId!: string;
  // アクセス権名
  public name!: string;
}

AccessModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    prototypeGroupId: {
      type: DataTypes.UUID,
      unique: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Access',
    timestamps: false,
  }
);

AccessModel.belongsTo(PrototypeGroupModel, {
  foreignKey: 'prototypeGroupId',
  onDelete: 'CASCADE',
});

export default AccessModel;
