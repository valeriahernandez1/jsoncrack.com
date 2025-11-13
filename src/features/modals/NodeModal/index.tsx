import React from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Text,
  ScrollArea,
  Flex,
  CloseButton,
  Button,
  TextInput,
  Group,
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import useFile from "../../../store/useFile";
import useJson from "../../../store/useJson";
import type { NodeData, NodeRow } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const json = useJson(state => state.json);
  const setContents = useFile(state => state.setContents);

  const [editing, setEditing] = React.useState(false);
  const [rows, setRows] = React.useState<NodeRow[]>([]);

  React.useEffect(() => {
    setRows(nodeData?.text ?? []);
    setEditing(false);
  }, [nodeData?.id, nodeData?.text, opened]);

  const isHexColor = (v: any) => typeof v === "string" && /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(v);

  const handleEdit = () => setEditing(true);

  const handleCancel = () => {
    setRows(nodeData?.text ?? []);
    setEditing(false);
  };

  const convertValueByType = (type: string | undefined, value: string) => {
    if (type === "number") {
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    }
    if (type === "boolean") {
      return value === "true";
    }
    if (type === "null") return null;
    return value;
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(json || "{}");

      const targetPath = nodeData?.path ?? [];

      // find the object to edit; if path is empty or not defined use root
      let objToEdit: any = parsed;
      if (targetPath && targetPath.length > 0) {
        objToEdit =
          targetPath.reduce((acc: any, seg: any) => (acc ? acc[seg] : undefined), parsed) ?? parsed;
      }

      rows.forEach((r, idx) => {
        if (!r.key) return;
        const originalRow = nodeData?.text?.[idx];
        const newKey = r.key as string;
        const newValueRaw = r.value as any;
        const newValue = convertValueByType(r.type, String(newValueRaw));

        if (originalRow && originalRow.key && originalRow.key !== newKey) {
          delete objToEdit[originalRow.key as string];
        }
        objToEdit[newKey] = newValue;
      });

      const jsonStr = JSON.stringify(parsed, null, 2);

      setContents({ contents: jsonStr, hasChanges: true });

      setEditing(false);
    } catch (e) {
      console.warn("Failed to save node edits", e);
    }
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <Group>
              {!editing && (
                <Button size="xs" variant="outline" onClick={handleEdit}>
                  Edit
                </Button>
              )}
              {editing && (
                <>
                  <Button size="xs" color="green" onClick={handleSave}>
                    Save
                  </Button>
                  <Button size="xs" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </>
              )}
              <CloseButton onClick={onClose} />
            </Group>
          </Flex>

          <ScrollArea.Autosize mah={250} maw={600}>
            {!editing ? (
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            ) : (
              <Stack gap="xs">
                {rows.map((row, idx) => {
                  if (!row.key) return null;

                  const value = row.value as any;
                  return (
                    <Group key={`${nodeData?.id}-${idx}`} align="flex-start">
                      <TextInput
                        size="xs"
                        style={{ width: 180 }}
                        label="Key"
                        value={String(row.key)}
                        onChange={e => {
                          const newRows = [...rows];
                          newRows[idx] = { ...newRows[idx], key: e.target.value } as NodeRow;
                          setRows(newRows);
                        }}
                      />

                      {row.type !== "object" &&
                        row.type !== "array" &&
                        (isHexColor(value) || String(row.key).toLowerCase() === "color" ? (
                          <input
                            type="color"
                            value={isHexColor(value) ? String(value) : "#000000"}
                            onChange={e => {
                              const newRows = [...rows];
                              newRows[idx] = { ...newRows[idx], value: e.target.value } as NodeRow;
                              setRows(newRows);
                            }}
                          />
                        ) : (
                          <TextInput
                            size="xs"
                            style={{ width: 220 }}
                            label="Value"
                            value={value === null ? "null" : String(value)}
                            onChange={e => {
                              const newRows = [...rows];
                              newRows[idx] = { ...newRows[idx], value: e.target.value } as NodeRow;
                              setRows(newRows);
                            }}
                          />
                        ))}
                    </Group>
                  );
                })}
              </Stack>
            )}
          </ScrollArea.Autosize>
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
