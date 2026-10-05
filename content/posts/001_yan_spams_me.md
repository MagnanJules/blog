---
title: Yan is spamming me
date: 2026-10-05
slug: 001_yan_spams_me
---

Yan is spamming me. I need a solution.

I have ufw, which is set up in my Ansible.

Here are the vars that our firewall will set:

```yaml
rate_limited_ports: "80,443"
rate_limit_new_connections: 60/minute
rate_limit_burst: 100
rate_limit_concurrent: 50
```

We create a handler for ufw to reload the firewall:

```yaml
- name: reload ufw
  ansible.builtin.command: ufw reload
```
