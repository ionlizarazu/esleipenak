import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Table,
  Spin,
  Upload,
  Button,
  message,
  type UploadFile,
  type TableProps,
} from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import {
  generateTableColumns,
  onlyUnique,
  processCity,
  type CityData,
} from './utils';
import type { UploadChangeParam } from 'antd/lib/upload';
import type { ColumnsType } from 'antd/es/table';
import type { EditableColumnType, TableRow } from './interfaces';
import { EditableCell, EditableRow } from './EditableComponents';
type TableRowSelection<T extends object = object> =
  TableProps<T>['rowSelection'];

const ExcelProcessor = ({ city }: { city: string | null }) => {
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [tableFilters, setTableFilters] = useState<object>({});
  const [tableColumns, setTableColumns] = useState<ColumnsType<TableRow>>([]);
  const [distances, setDistances] = useState<CityData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const tableDataRef = useRef<TableRow[]>(tableData);
  useEffect(() => {
    if (city) {
      setLoading(true);
      processCity(city)
        .then((data) => {
          setDistances(data);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [city]);

  useEffect(() => {
    if (tableData.length > 0) {
      setTableColumns(generateTableColumns(tableData, tableFilters));
    } else {
      setTableColumns([]);
    }
    tableDataRef.current = tableData;
  }, [tableData]);

  type ReadExcelFileType = TableRow[];
  type ReadArrayBuffer = Blob & UploadFile;

  const readExcelFile = async (
    file: UploadFile,
  ): Promise<ReadExcelFileType> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          let headerRow = 0;
          const range = XLSX.utils.decode_range(worksheet['!ref'] ?? '');

          for (let R = range.s.r; R <= range.e.r; ++R) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: 0 });

            if (
              worksheet[cellAddress] &&
              worksheet[cellAddress].v !== undefined &&
              worksheet[cellAddress].v !== null &&
              String(worksheet[cellAddress].v).trim() !== ''
            ) {
              headerRow = R;

              break;
            }
          }

          const newRange = { s: { r: headerRow, c: range.s.c }, e: range.e };
          worksheet['!ref'] = XLSX.utils.encode_range(newRange);
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: headerRow,
          });
          resolve(jsonData as ReadExcelFileType);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsArrayBuffer(file as ReadArrayBuffer);
    });
  };

  const handleFileSelected = async (file: UploadFile) => {
    setLoading(true);
    try {
      const data = await readExcelFile(file);
      const processedData = data.map((item, index) => {
        const centroValue = item['CENTRO'];
        const distanceData = distances.find(
          (d) => d.code === String(centroValue),
        )?.distances;

        return {
          ...item,
          key: index,
          Denbora: distanceData?.duration,
          Distantzia: distanceData?.distance,
        };
      });
      setTableFilters(
        Object.keys(processedData[0])
          .filter((key) => key !== 'key')
          .reduce((acc,k) => {
            acc[k]={
              placeholder: k,
              options: processedData
                .map((item) => item[k])
                .filter(onlyUnique)
                .sort()
                .map((item) => ({
                  text: String(item),
                  value: String(item),
                })),
            };
            return acc;
          }, {}),
      );
      setTableData(processedData);
    } catch (error) {
      message.error(
        `Arazoren bat egon da excel fitxategia prozesatzerakoan: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSelected = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Ez dago errenkadarik hautatuta deskargatzeko.');
      return;
    }
    const selectedRows = tableData.filter((row) =>
      selectedRowKeys.includes(row.key || 'doesnotincludethis'),
    );

    if (selectedRows.length === 0) {
      message.error('Errore bat gertatu da hautatutako errenkadak iragaztean.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(selectedRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SelectedData');

    XLSX.writeFile(wb, 'aukeratutako-plazak.xlsx');
    message.success('Hautatutako errenkadak ondo deskargatu dira.');
  };

  const uploaderProps = {
    name: 'file',
    accept: '.xlsx, .xls',
    beforeUpload: () => false,
    onChange: (info: UploadChangeParam) => {
      console.log('info.file', info.file);
      if (info.file) {
        handleFileSelected(info.file as UploadFile);
      } else {
        message.error(
          `${info.file} fitxategiarekin arazoren bat egon da, saiatu berriro.`,
        );
      }
    },
    showUploadList: false,
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };
  const rowSelection: TableRowSelection<TableRow> = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const selectedRowKeysSet = useMemo(() => {
    return new Set(selectedRowKeys);
  }, [selectedRowKeys]);
  const handleSave = (row: TableRow) => {
    const newData = [...tableData];
    const index = newData.findIndex((item) => row.key === item.key);
    const item = newData[index];
    newData.splice(index, 1, {
      ...item,
      ...row,
    });
    if (row.aukeratutakoOrdena && row.aukeratutakoOrdena !== '') {
      setSelectedRowKeys((prev)=>[...prev, row.key]);
    }else if(row.aukeratutakoOrdena === ''){
      setSelectedRowKeys((prev)=>prev.filter((key)=>key!==row.key));
    }
    setTableData(newData);
  };
  const dynamicSelectedColumn: EditableColumnType = useMemo(() => {
    return {
      key: 'aukeratutakoOrdena',
      title: 'Aukeraketa Ordena',
      dataIndex: 'aukeratutakoOrdena',
      fixed: 'left',
      onCell: (record: TableRow) => ({
        record,
        editable: true,
        key: 'aukeratutakoOrdena',
        dataIndex: 'aukeratutakoOrdena',
        title: 'Aukeraketa Ordena',
        handleSave,
      }),
      sorter: (a, b) => {
        const aDist = parseFloat(a['aukeratutakoOrdena']?.toString() ?? '9999');
        const bDist = parseFloat(b['aukeratutakoOrdena']?.toString() ?? '9999');
        return aDist - bDist;
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRowKeysSet, tableData]);

  const finalColumns = useMemo(() => {
    if (tableColumns.length === 0 && tableData.length === 0) {
      return [];
    }
    return [dynamicSelectedColumn, ...tableColumns];
  }, [dynamicSelectedColumn, tableColumns, tableData.length]);
  return (
    <div>
      <Upload {...uploaderProps}>
        <Button
          type={tableData.length > 0 ? 'default' : 'primary'}
          icon={<UploadOutlined />}
        >
          Aukeratu Excel fitxategi originala
        </Button>
      </Upload>
      <Button
        icon={<DownloadOutlined />}
        type='primary'
        onClick={handleDownloadSelected}
        style={{ marginLeft: '10px' }}
        disabled={selectedRowKeys.length === 0}
      >
        Deskargatu hautatutako errenkadak
      </Button>

      <div style={{ marginTop: '20px' }}>
        {loading ? (
          <Spin tip="Datuak kargatzen..." />
        ) : tableData.length > 0 ? (
          <>
            <Table
              components={{
                body: {
                  row: EditableRow,
                  cell: EditableCell,
                },
              }}
              rowSelection={rowSelection}
              dataSource={tableData}
              columns={finalColumns}
              scroll={{ x: 'max-content' }}
              size="small"
            />
          </>
        ) : (
          <p>Hemen agertuko da taula.</p>
        )}
      </div>
    </div>
  );
};

export default ExcelProcessor;
