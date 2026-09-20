-- Showcase: Ada — packages, records, and tasks.
with Ada.Text_IO; use Ada.Text_IO;
with Ada.Strings.Unbounded; use Ada.Strings.Unbounded;

package Highlight is
   Version : constant String := "0.4.0";

   type Kind is (Keyword, Str, Number, Other);

   type Span is record
      Start  : Natural := 0;
      Finish : Natural := 0;
      K      : Kind := Other;
   end record;

   function Width (S : Span) return Natural is (S.Finish - S.Start);

   type Span_Array is array (Positive range <>) of Span;

   function Highlight (Source : String) return Span_Array;

   task type Worker is
      entry Start (Id : Positive);
      entry Result (Count : out Natural);
   end Worker;
end Highlight;

package body Highlight is
   Keywords : constant array (1 .. 4) of Unbounded_String :=
     (To_Unbounded_String ("package"),
      To_Unbounded_String ("function"),
      To_Unbounded_String ("return"),
      To_Unbounded_String ("if"));

   function Is_Keyword (Word : String) return Boolean is
   begin
      for K of Keywords loop
         if To_String (K) = Word then
            return True;
         end if;
      end loop;
      return False;
   end Is_Keyword;

   function Highlight (Source : String) return Span_Array is
      Result : Span_Array (1 .. Source'Length);
      Count  : Natural := 0;
      I      : Positive := Source'First;
   begin
      if Source'Length = 0 then
         raise Constraint_Error with "empty source";
      end if;
      while I <= Source'Last loop
         if Source (I) /= ' ' then
            declare
               S : constant Positive := I;
            begin
               while I <= Source'Last and then Source (I) /= ' ' loop
                  I := I + 1;
               end loop;
               Count := Count + 1;
               Result (Count) := (S, I - 1, Other);
            end;
         else
            I := I + 1;
         end if;
      end loop;
      return Result (1 .. Count);
   end Highlight;

   task body Worker is
      My_Id : Positive;
      N     : Natural := 0;
   begin
      accept Start (Id : Positive) do
         My_Id := Id;
      end Start;
      delay 0.01;
      N := My_Id * 2;
      accept Result (Count : out Natural) do
         Count := N;
      end Result;
   end Worker;
end Highlight;
