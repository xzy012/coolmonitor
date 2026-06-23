# 酷监控 - 通知方式开发指南

本文档详细说明了如何在酷监控系统中添加新的通知方式，以钉钉推送为例进行说明。

## 目录

- [通知系统架构](#通知系统架构)
- [添加新通知方式的步骤](#添加新通知方式的步骤)
- [详细实现指南](#详细实现指南)
- [测试验证](#测试验证)
- [最佳实践](#最佳实践)

## 通知系统架构

### 核心组件

1. **通知服务** (`src/lib/monitors/notification-service.ts`)
   - 负责发送各种类型的通知
   - 包含通知触发逻辑和状态变化检测
   - 统一的通知数据格式处理

2. **通知设置界面** (`src/components/settings/notification-settings.tsx`)
   - 用户配置通知方式的前端界面
   - 动态表单渲染和配置管理
   - 通知测试功能

3. **通知测试API** (`src/app/api/settings/notifications/test/route.ts`)
   - 提供通知配置测试功能
   - 验证配置正确性

4. **数据存储**
   - `NotificationChannel` 表：存储通知渠道配置
   - `MonitorNotification` 表：监控项与通知渠道的关联关系

### 通知触发机制

```
监控检查 → 状态是否变化? → 调用通知服务 → 获取监控项的通知配置 → 遍历启用的通知渠道 → 根据类型调用对应发送函数 → 记录通知结果
```

### 通知数据格式

```typescript
interface NotificationData {
  monitorName: string;        // 监控项名称
  monitorType: string;        // 监控类型
  status: string;             // 状态描述（中文）
  statusText: string;         // 状态中文描述
  statusCode: number;         // 状态码：1=正常, 0=异常, 2=等待
  time: string;              // 变更时间
  message: string;           // 详细信息
  failureCount?: number;     // 连续失败次数
  firstFailureTime?: string; // 首次失败时间
  lastFailureTime?: string;  // 最后失败时间
  failureDuration?: number;  // 失败持续时间（分钟）
}
```

## 添加新通知方式的步骤

以添加"企业微信推送"为例，需要完成以下6个步骤：

### 1. 定义配置接口（后端）

在 `src/lib/monitors/notification-service.ts` 中：

```typescript
// 企业微信推送配置接口
interface WorkWechatConfig {
  webhookUrl: string;
  // 其他企业微信特有配置...
}
```

### 2. 更新通知类型（前端）

在 `src/components/settings/notification-settings.tsx` 中：

```typescript
type NotificationType = "邮件" | "Webhook" | "微信推送" | "钉钉推送" | "企业微信推送";
```

### 3. 实现发送函数（后端）

在 `src/lib/monitors/notification-service.ts` 中添加发送函数

### 4. 注册通知类型（后端）

在 `sendNotification` 函数的 switch 语句中添加case

### 5. 添加前端配置表单

在通知设置界面中添加企业微信配置项

### 6. 实现测试功能

在测试API中添加企业微信测试支持

## 详细实现指南

### 1. 后端通知服务实现

#### 步骤 1.1: 定义配置接口

```typescript
// 在 src/lib/monitors/notification-service.ts 顶部添加
interface WorkWechatConfig {
  webhookUrl: string;
  // 根据企业微信API要求添加其他配置项
}
```

#### 步骤 1.2: 实现发送函数

```typescript
/**
 * 发送企业微信推送通知
 */
async function sendWorkWechatNotification(
  config: WorkWechatConfig,
  data: NotificationData
) {
  const { webhookUrl } = config;
  
  if (!webhookUrl) {
    throw new Error('企业微信Webhook URL不能为空');
  }
  
  // 构建企业微信消息内容
  const content = {
    msgtype: "markdown",
    markdown: {
      content: `## 🔔 监控状态变更通知\n\n` +
        `**监控名称**: ${data.monitorName}\n` +
        `**监控类型**: ${data.monitorType}\n` +
        `**当前状态**: <font color="${data.statusCode === 1 ? 'info' : 'warning'}">${data.statusText}</font>\n` +
        `**变更时间**: ${data.time}\n` +
        (data.failureCount ? 
          `**连续失败次数**: ${data.failureCount} 次\n` +
          `**首次失败时间**: ${data.firstFailureTime}\n` +
          `**最后失败时间**: ${data.lastFailureTime}\n` +
          `**失败持续时间**: ${data.failureDuration} 分钟\n` : '') +
        `\n**详细信息**: ${data.message}`
    }
  };
  
  console.log(`发送企业微信通知: URL=${webhookUrl}, 监控项=${data.monitorName}, 状态=${data.statusText}`);
  
  try {
    const response = await axios.post(webhookUrl, content, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CoolMonitor-WorkWechat-Notification'
      },
      timeout: 10000
    });
    
    console.log(`企业微信通知发送成功: 状态码=${response.status}, 监控项=${data.monitorName}`);
    
    // 检查企业微信API返回结果
    if (response.data && response.data.errcode !== 0) {
      throw new Error(`企业微信API返回错误: ${response.data.errmsg || '未知错误'}`);
    }
    
    return response;
  } catch (error) {
    console.error(`企业微信通知发送失败: ${error}, 监控项=${data.monitorName}`);
    throw error;
  }
}
```

#### 步骤 1.3: 注册通知类型

在 `sendNotification` 函数中添加：

```typescript
case '企业微信推送':
  const workWechatConfig: WorkWechatConfig = {
    webhookUrl: String(config.webhookUrl || '')
  };
  return await sendWorkWechatNotification(workWechatConfig, data);
```

### 2. 前端界面实现

#### 步骤 2.1: 更新通知类型

```typescript
type NotificationType = "邮件" | "Webhook" | "微信推送" | "钉钉推送" | "企业微信推送";
```

#### 步骤 2.2: 添加配置表单处理

在 `getFormConfig` 函数中添加：

```typescript
case "企业微信推送": {
  const webhookUrl = form.querySelector('input[name="workWechatWebhookUrl"]') as HTMLInputElement;
  
  return {
    webhookUrl: webhookUrl?.value || ""
  };
}
```

在 `getDefaultConfig` 函数中添加：

```typescript
case "企业微信推送":
  return {
    webhookUrl: ""
  };
```

#### 步骤 2.3: 添加表单重置逻辑

在 `resetForm` 函数中添加：

```typescript
// 重置企业微信推送表单
const workWechatWebhookUrlInput = form.querySelector('input[name="workWechatWebhookUrl"]') as HTMLInputElement;
if (workWechatWebhookUrlInput) workWechatWebhookUrlInput.value = "";
```

#### 步骤 2.4: 添加图标和显示

在通知类型选择器中：

```typescript
<i className={`fas ${
  type === "邮件" ? "fa-envelope" :
  type === "Webhook" ? "fa-link" :
  type === "微信推送" ? "fa-weixin" :
  type === "钉钉推送" ? "fa-bell" :
  type === "企业微信推送" ? "fa-building" :  // 或其他合适的图标
  "fa-paper-plane"
} mr-2`}></i>
```

在通知列表显示中：

```typescript
{notification.enabled && notification.type === "企业微信推送" && (
  <div className="mt-3 pl-11 text-sm dark:text-foreground/80 text-light-text-secondary bg-primary/5 p-2 rounded-lg">
    <p>Webhook地址: <span className="font-mono text-xs">{String(notification.config.webhookUrl) || "未设置"}</span></p>
    {notification.defaultForNewMonitors && (
      <p className="mt-1 text-xs text-yellow-400 flex items-center">
        <i className="fas fa-star mr-1"></i>
        新增监控项时默认选中此通知
      </p>
    )}
  </div>
)}
```

#### 步骤 2.5: 添加配置表单

在通知类型配置表单中添加：

```typescript
{/* 企业微信推送配置项 */}
{selectedType === "企业微信推送" && (
  <div className="space-y-4">
    <div>
      <label className="text-xs font-medium dark:text-foreground text-light-text-primary">企业微信Webhook URL</label>
      <input 
        type="url" 
        name="workWechatWebhookUrl"
        className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxx"
        defaultValue={currentEditingNotification?.config?.webhookUrl as string || ""}
      />
      <p className="mt-1 text-xs dark:text-foreground text-light-text-secondary">
        请输入企业微信群机器人的Webhook地址
      </p>
    </div>

    {/* 配置说明 */}
    <div className="mt-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
      <h3 className="text-sm font-medium mb-3 dark:text-foreground text-light-text-primary">企业微信群机器人配置说明</h3>
      <ol className="text-xs dark:text-foreground/70 text-light-text-secondary list-decimal pl-5 space-y-2">
        <li>在企业微信群中添加"群机器人"</li>
        <li>选择"自定义机器人"类型</li>
        <li>复制Webhook地址到上方URL字段</li>
        <li>可选择IP白名单等安全设置</li>
      </ol>
    </div>
  </div>
)}
```

### 3. 测试API实现

#### 步骤 3.1: 添加配置接口

在 `src/app/api/settings/notifications/test/route.ts` 中：

```typescript
interface WorkWechatConfig {
  webhookUrl: string;
}
```

#### 步骤 3.2: 添加测试函数

```typescript
// 测试企业微信推送通知
async function testWorkWechatNotification(name: string, config: WorkWechatConfig) {
  const { webhookUrl } = config;
  
  if (!webhookUrl) {
    return NextResponse.json(
      { success: false, error: '企业微信Webhook URL不能为空' },
      { status: 400 }
    );
  }
  
  try {
    console.log(`开始测试企业微信推送: ${name}, URL: ${webhookUrl}`);
    
    // 构建测试消息
    const content = {
      msgtype: "markdown",
      markdown: {
        content: `## 🔔 酷监控通知测试\n\n` +
          `**通知名称**: ${name}\n` +
          `**测试时间**: ${formatDateTime()}\n\n` +
          `如果您收到此消息，表示您的企业微信推送设置已配置成功！`
      }
    };
    
    const response = await axios.post(webhookUrl, content, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CoolMonitor-WorkWechat-Notification'
      },
      timeout: 10000
    });
    
    console.log(`企业微信推送测试响应: 状态码=${response.status}, 数据=${JSON.stringify(response.data)}`);
    
    if (response.data && response.data.errcode !== undefined) {
      if (response.data.errcode === 0) {
        return NextResponse.json({ success: true, message: '测试企业微信推送已成功发送' });
      } else {
        return NextResponse.json(
          { success: false, error: `企业微信API返回错误: ${response.data.errmsg || '未知错误'}` },
          { status: 400 }
        );
      }
    } else if (response.status >= 200 && response.status < 300) {
      return NextResponse.json({ success: true, message: '测试企业微信推送已成功发送' });
    } else {
      return NextResponse.json(
        { success: false, error: `企业微信推送请求失败，响应状态码: ${response.status}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('发送企业微信推送通知失败:', error);
    let errorMessage = '发送企业微信推送请求失败';
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage += `: 服务器返回状态码 ${error.response.status}`;
        if (error.response.data && error.response.data.errmsg) {
          errorMessage += ` - ${error.response.data.errmsg}`;
        }
      } else if (error.request) {
        errorMessage += `: 请求发送成功但未收到响应，可能是网络问题或URL无效`;
      } else {
        errorMessage += `: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
```

#### 步骤 3.3: 注册测试函数

在主switch语句中添加：

```typescript
case '企业微信推送':
  return await testWorkWechatNotification(name, config as WorkWechatConfig);
```

## 测试验证

### 1. 功能测试清单

- [ ] 前端界面显示正确
- [ ] 配置表单可以正常填写和保存
- [ ] 测试通知功能正常
- [ ] 实际监控状态变化时能正确发送通知
- [ ] 错误处理和日志记录正常
- [ ] 界面显示和图标正确

### 2. 测试用例

1. **配置测试**
   - 添加新的通知配置
   - 编辑现有配置
   - 删除配置
   - 启用/禁用通知

2. **发送测试**
   - 测试通知功能
   - 监控状态变化触发
   - 错误配置处理
   - 网络异常处理

3. **界面测试**
   - 响应式布局
   - 表单验证
   - 用户体验

## 最佳实践

### 1. 配置设计原则

- **简洁性**: 只暴露必要的配置项给用户
- **安全性**: 敏感信息使用password类型输入框
- **易用性**: 提供详细的配置说明和示例
- **灵活性**: 支持可选配置项

### 2. 错误处理

- **完整的日志记录**: 记录详细的请求和响应信息
- **友好的错误提示**: 向用户提供可操作的错误信息
- **优雅降级**: 单个通知失败不影响其他通知
- **超时处理**: 设置合理的请求超时时间

### 3. 消息格式设计

- **结构化信息**: 使用标准的通知数据格式
- **平台优化**: 根据不同平台的特点优化消息展示
- **信息完整**: 包含足够的上下文信息
- **视觉突出**: 使用颜色、图标等突出重要信息

### 4. 性能考虑

- **异步处理**: 通知发送不阻塞主流程
- **请求超时**: 防止长时间阻塞
- **重试机制**: 对临时失败进行重试（可选）
- **批量处理**: 对大量通知进行批量处理（如需要）

### 5. 文档和维护

- **API文档**: 记录第三方API的调用方式
- **配置说明**: 提供详细的配置指南
- **故障排查**: 提供常见问题的解决方案
- **版本兼容**: 注意API版本变化的影响

## 代码模板

为了快速添加新的通知方式，可以参考以下代码模板：

### 后端模板

```typescript
// 1. 配置接口
interface [NotificationType]Config {
  webhookUrl: string;
  // 其他配置项...
}

// 2. 发送函数
async function send[NotificationType]Notification(
  config: [NotificationType]Config,
  data: NotificationData
) {
  const { webhookUrl } = config;
  
  if (!webhookUrl) {
    throw new Error('[通知类型]Webhook URL不能为空');
  }
  
  try {
    // 构建消息内容
    const content = {
      // 根据API格式构建
    };
    
    // 发送请求
    const response = await axios.post(webhookUrl, content, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CoolMonitor-[NotificationType]-Notification'
      },
      timeout: 10000
    });
    
    // 检查响应
    console.log(`[通知类型]通知发送成功: 状态码=${response.status}, 监控项=${data.monitorName}`);
    return response;
  } catch (error) {
    console.error(`[通知类型]通知发送失败: ${error}, 监控项=${data.monitorName}`);
    throw error;
  }
}

// 3. 注册到sendNotification函数
case '[通知类型]':
  const [notificationType]Config: [NotificationType]Config = {
    webhookUrl: String(config.webhookUrl || ''),
    // 其他配置项转换...
  };
  return await send[NotificationType]Notification([notificationType]Config, data);
```

### 前端模板

```typescript
// 1. 更新类型定义
type NotificationType = "邮件" | "Webhook" | "微信推送" | "钉钉推送" | "[新通知类型]";

// 2. 配置处理
case "[新通知类型]": {
  const webhookUrl = form.querySelector('input[name="[prefix]WebhookUrl"]') as HTMLInputElement;
  // 其他配置项获取...
  
  return {
    webhookUrl: webhookUrl?.value || "",
    // 其他配置项...
  };
}

// 3. 默认配置
case "[新通知类型]":
  return {
    webhookUrl: "",
    // 其他默认值...
  };

// 4. 表单重置
const [prefix]WebhookUrlInput = form.querySelector('input[name="[prefix]WebhookUrl"]') as HTMLInputElement;
if ([prefix]WebhookUrlInput) [prefix]WebhookUrlInput.value = "";

// 5. 界面显示组件
{notification.enabled && notification.type === "[新通知类型]" && (
  <div className="mt-3 pl-11 text-sm dark:text-foreground/80 text-light-text-secondary bg-primary/5 p-2 rounded-lg">
    <p>Webhook地址: <span className="font-mono text-xs">{String(notification.config.webhookUrl) || "未设置"}</span></p>
    {/* 其他状态显示... */}
  </div>
)}

// 6. 配置表单
{selectedType === "[新通知类型]" && (
  <div className="space-y-4">
    <div>
      <label className="text-xs font-medium dark:text-foreground text-light-text-primary">[通知类型]Webhook URL</label>
      <input 
        type="url" 
        name="[prefix]WebhookUrl"
        className="mt-1 w-full px-3 py-2 rounded-lg border border-primary/20 bg-dark-nav dark:bg-dark-nav bg-light-nav dark:text-foreground text-light-text-primary focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        placeholder="https://..."
        defaultValue={currentEditingNotification?.config?.webhookUrl as string || ""}
      />
    </div>
    {/* 其他配置项... */}
    
    {/* 配置说明 */}
    <div className="mt-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
      <h3 className="text-sm font-medium mb-3 dark:text-foreground text-light-text-primary">[通知类型]配置说明</h3>
      <ol className="text-xs dark:text-foreground/70 text-light-text-secondary list-decimal pl-5 space-y-2">
        <li>配置步骤1</li>
        <li>配置步骤2</li>
        {/* 其他步骤... */}
      </ol>
    </div>
  </div>
)}
```

## 实现案例：钉钉推送 vs 企业微信推送

以下是钉钉推送和企业微信推送的完整实现案例对比，可以作为参考：

### 钉钉推送实现

### 后端实现

```typescript
// 配置接口
interface DingTalkConfig {
  webhookUrl: string;
  secret?: string;
}

// 发送函数
async function sendDingTalkNotification(
  config: DingTalkConfig,
  data: NotificationData
) {
  const { webhookUrl, secret } = config;
  const messageType = 'markdown'; // 固定使用markdown格式
  
  if (!webhookUrl) {
    throw new Error('钉钉Webhook URL不能为空');
  }
  
  // 构建消息内容
  let content = '';
  const title = `酷监控 - ${data.monitorName} 状态${data.statusText}`;
  
  // 使用Markdown消息格式
  content = `## 🔔 监控状态变更通知\n\n` +
    `- **监控名称**: ${data.monitorName}\n` +
    `- **监控类型**: ${data.monitorType}\n` +
    `- **当前状态**: <font color="${data.statusCode === 1 ? '#10B981' : '#EF4444'}">${data.statusText}</font>\n` +
    `- **变更时间**: ${data.time}\n`;
  
  if (data.failureCount) {
    content += `- **连续失败次数**: ${data.failureCount} 次\n` +
      `- **首次失败时间**: ${data.firstFailureTime}\n` +
      `- **最后失败时间**: ${data.lastFailureTime}\n` +
      `- **失败持续时间**: ${data.failureDuration} 分钟\n`;
  }
  
  content += `\n**详细信息**:\n\n${data.message}`;
  
  // 构建钉钉消息体
  interface DingTalkMessageBody {
    msgtype: string;
    text?: {
      content: string;
    };
    markdown?: {
      title: string;
      text: string;
    };
    at: {
      atMobiles: string[];
      atUserIds: string[];
      isAtAll: boolean;
    };
  }
  
  const messageBody: DingTalkMessageBody = {
    msgtype: messageType,
    markdown: {
      title: title,
      text: content
    },
    at: {
      atMobiles: [],
      atUserIds: [],
      isAtAll: false
    }
  };
  
  // 如果配置了加签密钥，则生成签名
  let finalUrl = webhookUrl;
  if (secret) {
    const timestamp = Date.now();
    const stringToSign = `${timestamp}\n${secret}`;
    const sign = crypto.createHmac('sha256', secret).update(stringToSign).digest('base64');
    const encodedSign = encodeURIComponent(sign);
    finalUrl = `${webhookUrl}&timestamp=${timestamp}&sign=${encodedSign}`;
  }
  
  console.log(`发送钉钉通知: URL=${webhookUrl}, 监控项=${data.monitorName}, 状态=${data.statusText}`);
  console.log(`钉钉消息数据: ${JSON.stringify(messageBody)}`);
  
  try {
    // 发送钉钉推送请求
    const response = await axios.post(finalUrl, messageBody, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CoolMonitor-DingTalk-Notification'
      },
      timeout: 10000
    });
    
    console.log(`钉钉通知发送成功: 状态码=${response.status}, 监控项=${data.monitorName}`);
    
    // 检查钉钉API返回的结果
    if (response.data && response.data.errcode !== 0) {
      throw new Error(`钉钉API返回错误: ${response.data.errmsg || '未知错误'}`);
    }
    
    return response;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`钉钉通知发送失败，服务器响应: 状态码=${error.response.status}, 数据=${JSON.stringify(error.response.data)}, 监控项=${data.monitorName}`);
      } else if (error.request) {
        console.error(`钉钉通知发送失败，无响应: ${error.message}, 监控项=${data.monitorName}`);
      } else {
        console.error(`钉钉通知发送失败，请求配置错误: ${error.message}, 监控项=${data.monitorName}`);
      }
    } else {
      console.error(`钉钉通知发送失败，未知错误: ${error}, 监控项=${data.monitorName}`);
    }
    throw error;
  }
}

// 注册通知类型
case '钉钉推送':
  const dingtalkConfig: DingTalkConfig = {
    webhookUrl: String(config.webhookUrl || ''),
    secret: config.secret as string
  };
     return await sendDingTalkNotification(dingtalkConfig, data);
```

### 企业微信推送实现

```typescript
// 配置接口
interface WorkWechatConfig {
  webhookUrl: string;
}

// 发送函数
async function sendWorkWechatNotification(
  config: WorkWechatConfig,
  data: NotificationData
) {
  const { webhookUrl } = config;
  
  if (!webhookUrl) {
    throw new Error('企业微信Webhook URL不能为空');
  }
  
  // 构建企业微信消息内容
  const content = {
    msgtype: "markdown",
    markdown: {
      content: `## 🔔 监控状态变更通知\n\n` +
        `**监控名称**: ${data.monitorName}\n` +
        `**监控类型**: ${data.monitorType}\n` +
        `**当前状态**: <font color="${data.statusCode === 1 ? 'info' : 'warning'}">${data.statusText}</font>\n` +
        `**变更时间**: ${data.time}\n` +
        (data.failureCount ? 
          `**连续失败次数**: ${data.failureCount} 次\n` +
          `**首次失败时间**: ${data.firstFailureTime}\n` +
          `**最后失败时间**: ${data.lastFailureTime}\n` +
          `**失败持续时间**: ${data.failureDuration} 分钟\n` : '') +
        `\n**详细信息**: ${data.message}`
    }
  };
  
  console.log(`发送企业微信通知: URL=${webhookUrl}, 监控项=${data.monitorName}, 状态=${data.statusText}`);
  
  try {
    const response = await axios.post(webhookUrl, content, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CoolMonitor-WorkWechat-Notification'
      },
      timeout: 10000
    });
    
    console.log(`企业微信通知发送成功: 状态码=${response.status}, 监控项=${data.monitorName}`);
    
    // 检查企业微信API返回结果
    if (response.data && response.data.errcode !== 0) {
      throw new Error(`企业微信API返回错误: ${response.data.errmsg || '未知错误'}`);
    }
    
    return response;
  } catch (error) {
    console.error(`企业微信通知发送失败: ${error}, 监控项=${data.monitorName}`);
    throw error;
  }
}

// 注册通知类型
case '企业微信推送':
  const workWechatConfig: WorkWechatConfig = {
    webhookUrl: String(config.webhookUrl || '')
  };
  return await sendWorkWechatNotification(workWechatConfig, data);
```

### 主要差异对比

| 特性 | 钉钉推送 | 企业微信推送 |
|------|----------|-------------|
| 消息格式 | `msgtype: "markdown"` | `msgtype: "markdown"` |
| 加签验证 | 支持SHA256-HMAC加签 | 一般使用IP白名单 |
| 颜色支持 | 支持多种颜色 | 支持有限颜色 |
| 错误字段 | `errcode`/`errmsg` | `errcode`/`errmsg` |
| URL格式 | `https://oapi.dingtalk.com/robot/send?access_token=xxx` | `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx` |

## 总结

通过以上步骤，您可以系统性地为酷监控系统添加新的通知方式。关键要点：

1. **保持一致性**: 遵循现有的代码风格和架构模式
2. **完整实现**: 包括后端发送、前端配置、测试功能三个部分
3. **用户友好**: 提供清晰的配置说明和错误提示
4. **健壮性**: 完善的错误处理和日志记录
5. **可维护性**: 清晰的代码结构和详细的文档

这个指南将帮助您快速、准确地添加新的通知方式，如飞书、Slack、Microsoft Teams等。 