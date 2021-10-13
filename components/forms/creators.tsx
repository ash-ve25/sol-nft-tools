import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Form, Input } from "antd";
import { useForm } from "antd/lib/form/Form";
import React from "react";
import { solAddressValidator } from "../../util/validators";

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

export function CreatorsForm({ creators }) {
  const [form] = useForm();
  React.useEffect(() => {
    form.setFieldsValue({
      creators: creators,
    });
  }, [creators, form]);

  return (
    <Form form={form}>
      <Form.List name="creators">
        {(fields, { add, remove }, { errors }) => {
          console.log(fields);
          return (
            <>
              {fields.map((field, index) => (
                <>
                  <Form.Item
                    {...(index === 0
                      ? formItemLayout
                      : formItemLayoutWithOutLabel)}
                    label={index === 0 ? "Creators" : ""}
                    key={`creator-${field.key}`}
                  >
                    <Form.Item
                      {...field}
                      validateTrigger={["onBlur"]}
                      name={[index, "address"]}
                      rules={[solAddressValidator]}
                      noStyle
                      key={`share-${field.key}`}
                    >
                      <Input
                        placeholder="Creator Address"
                        style={{ width: "60%" }}
                      />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      validateTrigger={["onBlur"]}
                      name={[index, "share"]}
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: "Enter a share!",
                        },
                      ]}
                      noStyle
                    >
                      <Input
                        placeholder="Share"
                        style={{ width: "20%" }}
                        type="number"
                      />
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
              <Form.Item wrapperCol={{ sm: { span: 14, offset: 5 } }}>
                <Button
                  type="dashed"
                  onClick={() => add({ address: "", share: 0 })}
                  icon={<PlusOutlined />}
                  style={{ width: "100%" }}
                >
                  Add Creator
                </Button>
                <Form.ErrorList errors={errors} />
              </Form.Item>
            </>
          );
        }}
      </Form.List>
    </Form>
  );
}
