import type { ColumnType } from 'antd/es/table';

export interface TableRow {
  key: string | number | undefined;
  Denbora?: number;
  Distantzia?: number;
  [key: string]: string | number | undefined;
}

export interface EditableColumnType extends ColumnType<TableRow> {
  editable?: boolean;
}
interface Item {
  key: string;
  name: string;
  age: string;
  address: string;
}
export interface EditableRowProps {
  index: number;
}

export interface TableFilterItem {
  text: string;
  value: string;
}

export interface TableFilter {
  [key: string]: TableFilterItem[];
}
export interface EditableCellProps {
  title: React.ReactNode;
  editable: boolean;
  dataIndex: keyof Item;
  record: Item;
  handleSave: (record: Item) => void;
}
