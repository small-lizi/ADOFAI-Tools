const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 检查操作系统
if (process.platform !== 'darwin') {
    console.error('错误: 此脚本只能在 macOS 上运行');
    process.exit(1);
}

// 检查输入文件
const iconPath = path.join(__dirname, '..', 'assets', 'img', 'icon.png');
if (!fs.existsSync(iconPath)) {
    console.error('错误: 找不到 assets/img/icon.png');
    process.exit(1);
}

// 创建构建目录
const buildDir = path.join(__dirname, '..', 'build');
const iconsetDir = path.join(buildDir, 'icon.iconset');

if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
}

if (fs.existsSync(iconsetDir)) {
    fs.rmSync(iconsetDir, { recursive: true, force: true });
}
fs.mkdirSync(iconsetDir);

// 定义图标尺寸
const sizes = [
    { size: 16, name: '16x16' },
    { size: 32, name: '16x16@2x' },
    { size: 32, name: '32x32' },
    { size: 64, name: '32x32@2x' },
    { size: 128, name: '128x128' },
    { size: 256, name: '128x128@2x' },
    { size: 256, name: '256x256' },
    { size: 512, name: '256x256@2x' },
    { size: 512, name: '512x512' },
    { size: 1024, name: '512x512@2x' }
];

// 生成不同尺寸的图标
try {
    sizes.forEach(({ size, name }) => {
        const output = path.join(iconsetDir, `icon_${name}.png`);
        execSync(`sips -z ${size} ${size} "${iconPath}" --out "${output}"`);
        console.log(`✓ 生成 ${size}x${size} 图标`);
    });

    // 生成 icns 文件
    execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(buildDir, 'icon.icns')}"`);
    console.log('✓ 生成 icon.icns');

    // 清理临时文件
    fs.rmSync(iconsetDir, { recursive: true, force: true });
    console.log('✓ 清理临时文件');

    console.log('\n图标转换完成: build/icon.icns');
} catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
} 