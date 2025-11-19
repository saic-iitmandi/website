
export interface FileSystemNode {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FileSystemNode[];
  parent?: FileSystemNode;
}

export class VirtualFileSystem {
  private root: FileSystemNode;
  private currentDir: FileSystemNode;

  constructor() {
    this.root = this.createInitialFileSystem();
    this.currentDir = this.root;
  }

  private createInitialFileSystem(): FileSystemNode {
    const root: FileSystemNode = {
      name: '/',
      type: 'directory',
      children: [],
    };

    // Helper to create file
    const createFile = (name: string, content: string): FileSystemNode => ({
      name,
      type: 'file',
      content,
    });

    // Helper to create directory
    const createDir = (name: string, children: FileSystemNode[] = []): FileSystemNode => ({
      name,
      type: 'directory',
      children,
    });

    // Build the tree
    const readme = createFile(
      'README.txt',
      'Welcome to SAIC CyberSec Club.\r\nWe hack. We learn. We defend.\r\nEthical hacking at IIT Mandi.'
    );
    
    const members = createFile(
      'members.txt',
      'SAIC Core Team Members:\r\n\r\nCoordinator:\r\n- Abhinandan Kumar\r\n\r\nCore Team:\r\n- Somit Gond\r\n- Ayush Gaurav\r\n- Utsav\r\n- Divyanshu\r\n- Abhijith R Nair\r\n- Pranav Shirbhate\r\n- Vishnu\r\n- Piyush Panpaliya\r\n- Piyush Dwivedi\r\n- Davda James\r\n- Arani Ghosh\r\n\r\n'
    );

    const flag = createFile('flag.txt', 'SAIC{w3lc0m3_70_541c}');

    const exploits = createDir('exploits', [
      createFile('cve-2024-1337.py', '# Exploit for CVE-2024-1337\nimport os\nprint("Exploiting...")'),
      createFile('buffer_overflow.c', '// Buffer overflow example\n#include <stdio.h>\nvoid main() { char buf[10]; gets(buf); }'),
    ]);

    const tools = createDir('tools', [
      createFile('nmap', '#!/bin/bash\necho "Nmap scan initiated..."'),
      createFile('metasploit', '#!/bin/bash\necho "Starting Metasploit Framework..."'),
    ]);

    const secrets = createDir('secrets', [
        createFile('passwords.txt', 'admin:admin123\nroot:toor'),
    ]);

    root.children = [readme, members, flag, exploits, tools, secrets];

    // Set parents
    this.setParents(root);

    return root;
  }

  private setParents(node: FileSystemNode, parent?: FileSystemNode) {
    node.parent = parent;
    if (node.children) {
      node.children.forEach((child) => this.setParents(child, node));
    }
  }

  public getPrompt(): string {
    let path = this.getPwd();
    if (path === '/') {
        return 'root@saic:~$ ';
    }
    // Replace / with ~ for display if it's the root (simulating home dir as root here for simplicity, or just show full path)
    // Standard linux: user@host:cwd$ 
    // Let's just show the path relative to root, but maybe treat root as ~
    if (path === '/') return 'root@saic:~$ ';
    return `root@saic:${path}$ `;
  }

  public getPwd(): string {
    const path: string[] = [];
    let current: FileSystemNode | undefined = this.currentDir;
    while (current && current !== this.root) {
      path.unshift(current.name);
      current = current.parent;
    }
    return '/' + path.join('/');
  }

  public ls(args: string[]): string {
    const targetPath = args[0] || '.';
    const node = this.resolvePath(targetPath);

    if (!node) {
      return `ls: cannot access '${targetPath}': No such file or directory`;
    }

    if (node.type === 'file') {
      return node.name;
    }

    // It's a directory
    if (!node.children || node.children.length === 0) {
      return '';
    }

    // Check for -la or -l flag (simple check)
    const isLong = args.includes('-la') || args.includes('-l') || args.includes('-al');

    if (isLong) {
        return node.children.map(child => {
            const type = child.type === 'directory' ? 'd' : '-';
            const perm = 'rwxr-xr-x';
            const size = child.content ? child.content.length : 4096;
            const date = 'Nov 19 10:00';
            return `${type}${perm} 1 root root ${size.toString().padStart(5)} ${date} ${child.name}`;
        }).join('\r\n');
    }

    return node.children.map((child) => {
        if (child.type === 'directory') return child.name + '/';
        return child.name;
    }).join('  ');
  }

  public cd(path: string): string {
    if (!path || path === '~') {
      this.currentDir = this.root;
      return '';
    }

    const node = this.resolvePath(path);

    if (!node) {
      return `cd: ${path}: No such file or directory`;
    }

    if (node.type !== 'directory') {
      return `cd: ${path}: Not a directory`;
    }

    this.currentDir = node;
    return '';
  }

  public cat(args: string[]): string {
    if (args.length === 0) return 'cat: missing operand';
    
    const path = args[0];
    const node = this.resolvePath(path);

    if (!node) {
      return `cat: ${path}: No such file or directory`;
    }

    if (node.type === 'directory') {
      return `cat: ${path}: Is a directory`;
    }

    return node.content || '';
  }

  public resolvePath(path: string): FileSystemNode | null {
    if (path === '/' || path === '~') return this.root;
    if (path === '.') return this.currentDir;
    if (path === '..') return this.currentDir.parent || this.root;

    const parts = path.split('/').filter(p => p && p !== '.');
    let current = path.startsWith('/') ? this.root : this.currentDir;

    for (const part of parts) {
      if (part === '..') {
        current = current.parent || this.root;
        continue;
      }
      
      if (current.type !== 'directory' || !current.children) {
        return null;
      }

      const found = current.children.find(child => child.name === part);
      if (!found) {
        return null;
      }
      current = found;
    }

    return current;
  }

  public find(path: string = '.'): string {
      const startNode = this.resolvePath(path);
      if (!startNode) return `find: '${path}': No such file or directory`;

      const results: string[] = [];
      
      const traverse = (node: FileSystemNode, currentPath: string) => {
          results.push(currentPath);
          if (node.type === 'directory' && node.children) {
              for (const child of node.children) {
                  traverse(child, currentPath === '/' ? `/${child.name}` : `${currentPath}/${child.name}`);
              }
          }
      };

      // Determine initial path string for display
      let initialDisplayPath = path;
      if (path === '.') initialDisplayPath = '.';
      // If absolute path, use it. If relative, keep it relative.
      
      traverse(startNode, initialDisplayPath);
      return results.join('\r\n');
  }

  public getCompletions(input: string): string[] {
      // Input is the full command line buffer so far, or just the last argument?
      // Usually we complete the last token.
      const tokens = input.split(' ');
      const lastToken = tokens[tokens.length - 1];
      
      // If the last token is empty (space at end), we list contents of current dir
      // If it has content, we try to match
      
      let searchPath = '.';
      let partialName = lastToken;

      // Check if last token has path separators
      const lastSlashIndex = lastToken.lastIndexOf('/');
      if (lastSlashIndex !== -1) {
          searchPath = lastToken.substring(0, lastSlashIndex) || '/';
          partialName = lastToken.substring(lastSlashIndex + 1);
      }

      const dirNode = this.resolvePath(searchPath);
      if (!dirNode || dirNode.type !== 'directory' || !dirNode.children) {
          return [];
      }

      const matches = dirNode.children
          .filter(child => child.name.startsWith(partialName))
          .map(child => {
              // Return the full path segment that replaces the partial name
              // Actually, usually we return just the name, but for the replacement logic we might need more.
              // Let's return just the names for now, and the UI can handle appending.
              if (child.type === 'directory') return child.name + '/';
              return child.name;
          });

      return matches;
  }
}
