import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Form, Input } from "antd";
import { useForm } from "antd/lib/form/Form";
import React from "react";
import { solAddressValidator } from "../util/validators";

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 5 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 20 },
  },
};
const formItemLayoutWithOutLabel = {
  wrapperCol: {
    xs: { span: 24, offset: 0 },
    sm: { span: 20, offset: 5 },
  },
};

export interface FieldData {
  name: string | number | (string | number)[];
  value?: any;
  touched?: boolean;
  validating?: boolean;
  errors?: string[];
}

export interface CustomizedFormProps {
  onChange: (fields: FieldData[]) => void;
  fields: FieldData[];
}

export const AttributesForm: React.FC<CustomizedFormProps> = ({
  onChange,
  fields,
}) => {
  return (
    <Form
      onFieldsChange={(_, allFields) => {
        console.log(allFields);
        onChange(allFields);
      }}
      fields={fields}
    >
      <Form.List name="attributes">
        {(fields, { add, remove }, { errors }) => {
          // console.log(fields)
          return (
            <>
              {fields.map((field, index) => (
                <>
                  <Form.Item
                    {...(index === 0
                      ? formItemLayout
                      : formItemLayoutWithOutLabel)}
                    label={index === 0 ? "Trait" : ""}
                    key={`trait-${field.key}`}
                  >
                    <Form.Item
                      {...field}
                      validateTrigger={["onBlur"]}
                      name={[index, "trait_type"]}
                      noStyle
                      rules={[
                        {
                          required: true,
                          message: "Enter a trait type!",
                        },
                      ]}
                      key={`share-${field.key}`}
                    >
                      <Input
                        placeholder="Trait Type"
                        style={{ width: "45%" }}
                      />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      validateTrigger={["onBlur"]}
                      name={[index, "value"]}
                      rules={[
                        {
                          required: true,
                          message: "Enter a value!",
                        },
                      ]}
                      noStyle
                    >
                      <Input placeholder="Value" style={{ width: "45%" }} />
                    </Form.Item>
                    {fields.length > 1 ? (
                      <MinusCircleOutlined
                        className="dynamic-delete-button"
                        onClick={() => remove(field.name)}
                      />
                    ) : null}
                  </Form.Item>
                </>
              ))}
              {/* <Form.Item wrapperCol={{ sm: { span: 14, offset: 5 } }}>
                <Button
                  type="dashed"
                  onClick={() => add({ trait_type: "", value: "" })}
                  icon={<PlusOutlined />}
                  style={{ width: "100%" }}
                >
                  Add Attribute
                </Button>
                <Form.ErrorList errors={errors} />
              </Form.Item> */}
            </>
          );
        }}
      </Form.List>
    </Form>
  );
};
