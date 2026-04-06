/**
 * 统一输入校验工具模块
 * 为整个项目提供一致的校验规则，便于集中维护
 */

// 用户名规则：4-20位，只允许字母、数字、下划线，不能以数字开头
const USERNAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{3,19}$/

// 密码规则：8-32位，必须包含字母和数字
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,32}$/

// 显示名称规则：1-20个字符（支持中文）
const DISPLAY_NAME_REGEX = /^[\u4e00-\u9fa5a-zA-Z0-9\s\-_·]{1,20}$/

/**
 * 校验用户名
 * @param {string} username
 * @returns {{ valid: boolean, message?: string }}
 */
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: '用户名不能为空' }
  }
  const trimmed = username.trim()
  if (trimmed.length < 4) {
    return { valid: false, message: '用户名至少4个字符' }
  }
  if (trimmed.length > 20) {
    return { valid: false, message: '用户名最多20个字符' }
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return { valid: false, message: '用户名只能包含字母、数字、下划线，且不能以数字开头' }
  }
  return { valid: true }
}

/**
 * 校验密码
 * @param {string} password
 * @returns {{ valid: boolean, message?: string }}
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: '密码不能为空' }
  }
  if (password.length < 8) {
    return { valid: false, message: '密码至少8个字符' }
  }
  if (password.length > 32) {
    return { valid: false, message: '密码最多32个字符' }
  }
  if (!PASSWORD_REGEX.test(password)) {
    return { valid: false, message: '密码必须包含字母和数字' }
  }
  return { valid: true }
}

/**
 * 校验显示姓名
 * @param {string} name
 * @returns {{ valid: boolean, message?: string }}
 */
function validateDisplayName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: '姓名不能为空' }
  }
  const trimmed = name.trim()
  if (trimmed.length < 1) {
    return { valid: false, message: '姓名不能为空' }
  }
  if (trimmed.length > 20) {
    return { valid: false, message: '姓名最多20个字符' }
  }
  if (!DISPLAY_NAME_REGEX.test(trimmed)) {
    return { valid: false, message: '姓名只能包含中文、字母、数字及常用符号' }
  }
  return { valid: true }
}

module.exports = { validateUsername, validatePassword, validateDisplayName, USERNAME_REGEX, PASSWORD_REGEX }
