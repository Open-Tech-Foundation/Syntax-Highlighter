Showcase: reStructuredText
==============================

One *tokenizer* for **browser** highlights, ``HTML``, and ANSI output.

.. note::
   Tokens use exclusive ``start``/``end`` offsets.

.. warning:: Unknown languages raise, never guess.

Section levels
--------------

Subsections use dashes; sub-subsections use tildes:

~~~~~~~~~~~~~~~~
Deeply nested
~~~~~~~~~~~~~~~~

Lists, tables, and links:

- dash item with `literal`
- [ ] unchecked box (needs extension)

1. First step
2. Second step

=====  =====  ======
Lang   Files  Tokens
=====  =====  ======
JS       120   9,800
Py        85   6,100
=====  =====  ======

See `the docs <https://example.com/docs>`_ and :ref:`api-label`.

.. _api-label:

API details
-----------

.. code:: typescript

   const hl = await createHighlighter({ language: "typescript" });

.. image:: /hero.png
   :alt: Abstract tokens
   :width: 640px

| Symbol | Means      |
|--------|------------|
| ``+``  | addition   |
| ``-``  | deletion   |
